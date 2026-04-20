#!/usr/bin/env tsx
/**
 * FlowLab batch UI refactor script
 *
 * Purpose
 * - Batch-clean legacy UI patterns across apps/portal and apps/web
 * - Remove banned legacy utility classes like .surface / .panel / .ghost
 * - Convert simple inline style={{ ... }} objects into Tailwind classes
 * - Normalize raw HTML tables to shadcn table primitives where safe
 * - Add TODO comments for cases that need manual conversion
 */

import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import {
  Node,
  Project,
  QuoteKind,
  SyntaxKind,
  type JsxAttribute,
  type JsxExpression,
  type ObjectLiteralExpression,
  type SourceFile,
} from "ts-morph";

const ROOT = process.cwd();
const WRITE = process.argv.includes("--write");
const DRY_RUN = process.argv.includes("--dry-run") || !WRITE;
const SCOPE = getArg("--scope");
const MATCH = getArg("--match");
const BATCH = getArg("--batch");

const TARGET_GLOBS = resolveTargetGlobs(SCOPE);
const IGNORE = [
  "**/.next/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/*.d.ts",
  "**/components/ui/**",
  "**/lib/generated/**",
];

const LEGACY_CLASS_REPLACEMENTS: Record<string, string[]> = {
  surface: ["rounded-xl", "border", "border-white/8", "bg-card", "shadow-sm"],
  "surface-soft": ["rounded-xl", "border", "border-white/8", "bg-muted/30"],
  sidebar: ["rounded-xl", "border", "border-white/8", "bg-card"],
  cta: ["inline-flex", "items-center", "justify-center"],
  ghost: ["text-muted-foreground", "hover:text-foreground"],
  panel: ["rounded-xl", "border", "border-white/8", "bg-card", "shadow-sm"],
  "panel-soft": ["rounded-xl", "border", "border-white/8", "bg-muted/30"],
  "hero-card": ["rounded-2xl", "border", "border-white/8", "bg-card", "shadow-sm"],
  metric: ["rounded-xl", "border", "border-white/8", "bg-card", "p-4"],
};

const BANNED_CLASSES = new Set(Object.keys(LEGACY_CLASS_REPLACEMENTS));

const BATCH_MATCHERS: Record<string, string[]> = {
  ops: [
    "/crm/",
    "/customers/",
    "/jobs/",
    "/quotes/",
    "/invoices/",
    "crm/page",
    "customers/page",
    "jobs/page",
    "quotes/page",
    "invoices/page",
  ],
  admin: [
    "/settings/",
    "/integrations/",
    "/retention/",
    "/scheduler/",
    "settings/page",
    "integrations/page",
    "retention/page",
    "scheduler/page",
  ],
  lifecycle: [
    "/upgrade/",
    "/agreements/",
    "/onboarding/",
    "/system-health/",
    "/systemhealth/",
    "upgrade/page",
    "agreements/page",
    "onboarding/page",
    "system-health/page",
    "systemhealth/page",
  ],
  web: ["/apps/web/", "apps/web/app", "apps/web/components"],
  all: [],
};

type FileReport = {
  filePath: string;
  changed: boolean;
  classUpdates: number;
  styleConversions: number;
  tableUpgrades: number;
  todos: string[];
};

const STYLE_MAP: Record<string, (value: string) => string[] | null> = {
  marginTop: pxScale("mt"),
  marginBottom: pxScale("mb"),
  marginLeft: pxScale("ml"),
  marginRight: pxScale("mr"),
  paddingTop: pxScale("pt"),
  paddingBottom: pxScale("pb"),
  paddingLeft: pxScale("pl"),
  paddingRight: pxScale("pr"),
  gap: pxScale("gap"),
  rowGap: pxScale("gap-y"),
  columnGap: pxScale("gap-x"),
  borderRadius: borderRadiusScale,
  textAlign: (value) =>
    oneOf(value, {
      left: ["text-left"],
      center: ["text-center"],
      right: ["text-right"],
      justify: ["text-justify"],
    }),
  fontWeight: (value) =>
    oneOf(normalizeNumberish(value), {
      "400": ["font-normal"],
      "500": ["font-medium"],
      "600": ["font-semibold"],
      "700": ["font-bold"],
    }),
  display: (value) =>
    oneOf(value, {
      flex: ["flex"],
      grid: ["grid"],
      block: ["block"],
      inline: ["inline"],
      "inline-flex": ["inline-flex"],
      none: ["hidden"],
    }),
  alignItems: (value) =>
    oneOf(value, {
      center: ["items-center"],
      start: ["items-start"],
      end: ["items-end"],
      stretch: ["items-stretch"],
      baseline: ["items-baseline"],
    }),
  justifyContent: (value) =>
    oneOf(value, {
      center: ["justify-center"],
      start: ["justify-start"],
      end: ["justify-end"],
      "flex-start": ["justify-start"],
      "flex-end": ["justify-end"],
      "space-between": ["justify-between"],
      "space-around": ["justify-around"],
      "space-evenly": ["justify-evenly"],
    }),
  flexDirection: (value) =>
    oneOf(value, {
      row: ["flex-row"],
      column: ["flex-col"],
      "row-reverse": ["flex-row-reverse"],
      "column-reverse": ["flex-col-reverse"],
    }),
  width: (value) => sizeScale("w", value),
  minWidth: (value) => sizeScale("min-w", value),
  maxWidth: (value) => sizeScale("max-w", value),
  height: (value) => sizeScale("h", value),
  minHeight: (value) => sizeScale("min-h", value),
  maxHeight: (value) => sizeScale("max-h", value),
};

const project = new Project({
  manipulationSettings: { quoteKind: QuoteKind.Double },
  skipAddingFilesFromTsConfig: true,
  compilerOptions: {
    allowJs: true,
  },
});

main();

function main(): void {
  const files = fg
    .sync(TARGET_GLOBS, {
      cwd: ROOT,
      absolute: true,
      onlyFiles: true,
      ignore: IGNORE,
    })
    .filter((filePath) => shouldIncludeFile(filePath));

  if (files.length === 0) {
    console.log("No matching files found.");
    return;
  }

  for (const file of files) {
    project.addSourceFileAtPathIfExists(file);
  }

  const report: FileReport[] = [];

  for (const sourceFile of project.getSourceFiles()) {
    const originalText = fs.readFileSync(sourceFile.getFilePath(), "utf8");
    const fileReport: FileReport = {
      filePath: relative(sourceFile.getFilePath()),
      changed: false,
      classUpdates: 0,
      styleConversions: 0,
      tableUpgrades: 0,
      todos: [],
    };

    removeLegacyClasses(sourceFile, fileReport);
    convertSimpleInlineStyles(sourceFile, fileReport);
    normalizeRawTables(sourceFile, fileReport);
    addManualReviewNotes(sourceFile, fileReport);
    organizeImportsSafe(sourceFile);

    const nextText = sourceFile.getFullText();
    fileReport.changed = originalText !== nextText;

    if (fileReport.changed && WRITE) {
      sourceFile.saveSync();
    }

    report.push(fileReport);
  }

  printReport(report);

  if (DRY_RUN) {
    console.log("\nDry run only. Re-run with --write to save changes.");
  }
}

function resolveTargetGlobs(scope?: string | null): string[] {
  if (scope === "portal") return ["apps/portal/**/*.{ts,tsx,js,jsx}"];
  if (scope === "web") return ["apps/web/**/*.{ts,tsx,js,jsx}"];
  return ["apps/portal/**/*.{ts,tsx,js,jsx}", "apps/web/**/*.{ts,tsx,js,jsx}"];
}

function getArg(flag: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!direct) return null;
  return direct.slice(flag.length + 1).trim() || null;
}

function relative(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function shouldIncludeFile(filePath: string): boolean {
  const lower = filePath.toLowerCase().replace(/\\/g, "/");

  if (MATCH && !lower.includes(MATCH.toLowerCase())) {
    return false;
  }

  if (!BATCH || BATCH.toLowerCase() === "all") {
    return true;
  }

  const patterns = BATCH_MATCHERS[BATCH.toLowerCase()];
  if (!patterns) {
    console.error(`Unknown batch: ${BATCH}`);
    console.error(`Valid batches: ${Object.keys(BATCH_MATCHERS).join(", ")}`);
    process.exit(1);
  }

  return patterns.some((pattern) => lower.includes(pattern));
}

function removeLegacyClasses(sourceFile: SourceFile, fileReport: FileReport): void {
  const attrs = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);

  for (const attr of attrs) {
    if (attr.getNameNode().getText() !== "className") continue;

    const initializer = attr.getInitializer();
    if (!initializer) continue;

    if (Node.isStringLiteral(initializer)) {
      const normalized = normalizeClassString(initializer.getLiteralText());
      if (normalized.changed) {
        initializer.replaceWithText(`"${normalized.value}"`);
        fileReport.classUpdates += 1;
      }
      continue;
    }

    if (!Node.isJsxExpression(initializer)) continue;

    const expr = initializer.getExpression();
    if (!expr) continue;

    if (Node.isStringLiteral(expr) || Node.isNoSubstitutionTemplateLiteral(expr)) {
      const normalized = normalizeClassString(expr.getLiteralText());
      if (normalized.changed) {
        expr.replaceWithText(`"${normalized.value}"`);
        fileReport.classUpdates += 1;
      }
      continue;
    }

    if (Node.isTemplateExpression(expr)) {
      const maybe = normalizeTemplateExpressionText(expr.getText());
      if (maybe.changed) {
        expr.replaceWithText(maybe.value);
        fileReport.classUpdates += 1;
      }
      continue;
    }

    if (Node.isCallExpression(expr) && looksLikeCnCall(expr.getText())) {
      const maybe = normalizeCnCallText(expr.getText());
      if (maybe.changed) {
        expr.replaceWithText(maybe.value);
        fileReport.classUpdates += 1;
      }
    }
  }
}

function convertSimpleInlineStyles(sourceFile: SourceFile, fileReport: FileReport): void {
  const attrs = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);

  for (const attr of attrs) {
    if (attr.getNameNode().getText() !== "style") continue;

    const initializer = attr.getInitializer();
    if (!initializer || !Node.isJsxExpression(initializer)) continue;

    const expr = initializer.getExpression();
    if (!expr || !Node.isObjectLiteralExpression(expr)) {
      fileReport.todos.push(`manual style review: ${locationHint(attr)}`);
      continue;
    }

    const conversion = convertStyleObject(expr);
    if (!conversion) {
      fileReport.todos.push(`manual style review: ${locationHint(attr)}`);
      continue;
    }

    mergeClassesIntoElement(attr, conversion.classes);
    attr.remove();
    fileReport.styleConversions += 1;
  }
}

function normalizeRawTables(sourceFile: SourceFile, fileReport: FileReport): void {
  const textBefore = sourceFile.getFullText();
  if (!textBefore.includes("<table")) return;

  ensureTableImports(sourceFile);

  const textAfter = textBefore
    .replace(/<table(\s[^>]*)?>/g, (_m, attrs) => `<Table${attrs ?? ""}>`)
    .replace(/<\/table>/g, "</Table>")
    .replace(/<thead(\s[^>]*)?>/g, (_m, attrs) => `<TableHeader${attrs ?? ""}>`)
    .replace(/<\/thead>/g, "</TableHeader>")
    .replace(/<tbody(\s[^>]*)?>/g, (_m, attrs) => `<TableBody${attrs ?? ""}>`)
    .replace(/<\/tbody>/g, "</TableBody>")
    .replace(/<tr(\s[^>]*)?>/g, (_m, attrs) => `<TableRow${attrs ?? ""}>`)
    .replace(/<\/tr>/g, "</TableRow>")
    .replace(/<th(\s[^>]*)?>/g, (_m, attrs) => `<TableHead${attrs ?? ""}>`)
    .replace(/<\/th>/g, "</TableHead>")
    .replace(/<td(\s[^>]*)?>/g, (_m, attrs) => `<TableCell${attrs ?? ""}>`)
    .replace(/<\/td>/g, "</TableCell>");

  if (textAfter !== textBefore) {
    sourceFile.replaceWithText(textAfter);
    fileReport.tableUpgrades += 1;
  }
}

function addManualReviewNotes(sourceFile: SourceFile, fileReport: FileReport): void {
  const text = sourceFile.getFullText();

  if (/style=\{\{/.test(text)) {
    prependTodoIfMissing(
      sourceFile,
      "TODO(ui-refactor): complex inline style remains and needs manual Tailwind conversion."
    );
    fileReport.todos.push("remaining complex style object");
  }

  if (/<table\b/.test(text) && /@tanstack\/react-table|useReactTable|DataTable/.test(text)) {
    prependTodoIfMissing(
      sourceFile,
      "TODO(ui-refactor): verify table structure manually and prefer the shared data-table pattern where appropriate."
    );
    fileReport.todos.push("manual table review");
  }
}

function organizeImportsSafe(sourceFile: SourceFile): void {
  try {
    sourceFile.organizeImports();
  } catch {
    // ignore import organization errors
  }
}

function convertStyleObject(node: ObjectLiteralExpression): { classes: string[] } | null {
  const classes: string[] = [];

  for (const prop of node.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) return null;

    const name = prop.getName();
    const initializer = prop.getInitializer();
    if (!initializer) return null;

    const value = literalValue(initializer);
    if (value == null) return null;

    const mapper = STYLE_MAP[name];
    if (!mapper) return null;

    const mapped = mapper(value);
    if (!mapped?.length) return null;
    classes.push(...mapped);
  }

  const deduped = unique(classes);
  return deduped.length ? { classes: deduped } : null;
}

function mergeClassesIntoElement(styleAttr: JsxAttribute, classesToAdd: string[]): void {
  const element = styleAttr.getParent();
  if (!Node.isJsxOpeningElement(element) && !Node.isJsxSelfClosingElement(element)) return;

  const classAttr = element.getAttributes().find((candidate) => {
    if (!Node.isJsxAttribute(candidate)) return false;
    return candidate.getNameNode().getText() === "className";
  });

  if (!classAttr || !Node.isJsxAttribute(classAttr)) {
    element.addAttribute({
      name: "className",
      initializer: `"${classesToAdd.join(" ")}"`,
    });
    return;
  }

  const initializer = classAttr.getInitializer();
  if (!initializer) {
    classAttr.setInitializer(`"${classesToAdd.join(" ")}"`);
    return;
  }

  if (Node.isStringLiteral(initializer)) {
    initializer.replaceWithText(
      `"${mergeClassLists(initializer.getLiteralText(), classesToAdd.join(" "))}"`
    );
    return;
  }

  if (!Node.isJsxExpression(initializer)) return;
  const expr = initializer.getExpression();
  if (!expr) return;

  if (Node.isStringLiteral(expr) || Node.isNoSubstitutionTemplateLiteral(expr)) {
    expr.replaceWithText(
      `"${mergeClassLists(expr.getLiteralText(), classesToAdd.join(" "))}"`
    );
    return;
  }

  if (Node.isCallExpression(expr) && looksLikeCnCall(expr.getText())) {
    expr.replaceWithText(injectClassesIntoCnCall(expr.getText(), classesToAdd));
    return;
  }

  expr.replaceWithText(`cn(${expr.getText()}, "${classesToAdd.join(" ")}")`);
  ensureCnImport(expr.getSourceFile());
}

function normalizeClassString(input: string): { value: string; changed: boolean } {
  const next = expandAndFilterClasses(tokenizeClassString(input));
  const value = next.join(" ").trim();
  return { value, changed: value !== input.trim().replace(/\s+/g, " ") };
}

function normalizeTemplateExpressionText(input: string): { value: string; changed: boolean } {
  let output = input;

  for (const banned of BANNED_CLASSES) {
    const re = new RegExp(`(['"\\\\])${escapeRegExp(banned)}\\\\1`, "g");
    output = output.replace(re, `"${LEGACY_CLASS_REPLACEMENTS[banned].join(" ")}"`);
  }

  return { value: output, changed: output !== input };
}

function normalizeCnCallText(input: string): { value: string; changed: boolean } {
  let output = input;

  for (const banned of BANNED_CLASSES) {
    const re = new RegExp(`(['"\\\\])${escapeRegExp(banned)}\\\\1`, "g");
    output = output.replace(re, `"${LEGACY_CLASS_REPLACEMENTS[banned].join(" ")}"`);
  }

  return { value: output, changed: output !== input };
}

function injectClassesIntoCnCall(callText: string, classesToAdd: string[]): string {
  const closeIndex = callText.lastIndexOf(")");
  if (closeIndex === -1) return callText;
  return `${callText.slice(0, closeIndex)}, "${classesToAdd.join(" ")}"${callText.slice(closeIndex)}`;
}

function tokenizeClassString(input: string): string[] {
  return input
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function expandAndFilterClasses(tokens: string[]): string[] {
  const next: string[] = [];

  for (const token of tokens) {
    if (!BANNED_CLASSES.has(token)) {
      next.push(token);
      continue;
    }
    next.push(...LEGACY_CLASS_REPLACEMENTS[token]);
  }

  return unique(next);
}

function mergeClassLists(existing: string, addition: string): string {
  return unique([...tokenizeClassString(existing), ...tokenizeClassString(addition)]).join(" ");
}

function ensureTableImports(sourceFile: SourceFile): void {
  ensureNamedImports(sourceFile, "@/components/ui/table", [
    "Table",
    "TableBody",
    "TableCell",
    "TableHead",
    "TableHeader",
    "TableRow",
  ]);
}

function ensureCnImport(sourceFile: SourceFile): void {
  ensureNamedImports(sourceFile, "@/components/ui/utils", ["cn"]);
}

function ensureNamedImports(sourceFile: SourceFile, moduleSpecifier: string, names: string[]): void {
  let decl = sourceFile.getImportDeclaration(
    (d) => d.getModuleSpecifierValue() === moduleSpecifier
  );

  if (!decl) {
    sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: names,
    });
    return;
  }

  const existing = new Set(decl.getNamedImports().map((n) => n.getName()));
  for (const name of names) {
    if (!existing.has(name)) {
      decl.addNamedImport(name);
    }
  }
}

function prependTodoIfMissing(sourceFile: SourceFile, todo: string): void {
  const text = sourceFile.getFullText();
  if (!text.includes(todo)) {
    sourceFile.replaceWithText(`${todo}\n${text}`);
  }
}

function looksLikeCnCall(input: string): boolean {
  return /^cn\(/.test(input.trim()) || /\bcn\(/.test(input);
}

function literalValue(node: Node): string | null {
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralText();
  }

  if (Node.isNumericLiteral(node)) {
    return node.getLiteralText();
  }

  const text = node.getText().trim();

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith("`") && text.endsWith("`"))
  ) {
    return text.slice(1, -1);
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return text;
  }

  return null;
}

function pxScale(prefix: string) {
  return (value: string): string[] | null => {
    const normalized = normalizeNumberish(value);
    const map: Record<string, string> = {
      "0": `${prefix}-0`,
      "2": `${prefix}-0.5`,
      "4": `${prefix}-1`,
      "6": `${prefix}-1.5`,
      "8": `${prefix}-2`,
      "10": `${prefix}-2.5`,
      "12": `${prefix}-3`,
      "14": `${prefix}-3.5`,
      "16": `${prefix}-4`,
      "20": `${prefix}-5`,
      "24": `${prefix}-6`,
      "28": `${prefix}-7`,
      "32": `${prefix}-8`,
      "36": `${prefix}-9`,
      "40": `${prefix}-10`,
      "48": `${prefix}-12`,
      "56": `${prefix}-14`,
      "64": `${prefix}-16`,
    };

    return map[normalized] ? [map[normalized]] : null;
  };
}

function borderRadiusScale(value: string): string[] | null {
  const normalized = normalizeNumberish(value);
  const map: Record<string, string[]> = {
    "0": ["rounded-none"],
    "2": ["rounded-sm"],
    "4": ["rounded"],
    "6": ["rounded-md"],
    "8": ["rounded-lg"],
    "12": ["rounded-xl"],
    "16": ["rounded-2xl"],
    "24": ["rounded-3xl"],
    "9999": ["rounded-full"],
  };

  return map[normalized] ?? null;
}

function sizeScale(prefix: string, value: string): string[] | null {
  const normalized = normalizeNumberish(value);
  const pxMap: Record<string, string> = {
    "0": `${prefix}-0`,
    "16": `${prefix}-4`,
    "20": `${prefix}-5`,
    "24": `${prefix}-6`,
    "32": `${prefix}-8`,
    "40": `${prefix}-10`,
    "48": `${prefix}-12`,
    "56": `${prefix}-14`,
    "64": `${prefix}-16`,
    "80": `${prefix}-20`,
    "96": `${prefix}-24`,
    "112": `${prefix}-28`,
    "128": `${prefix}-32`,
    "160": `${prefix}-40`,
    "192": `${prefix}-48`,
    "224": `${prefix}-56`,
    "256": `${prefix}-64`,
  };

  if (pxMap[normalized]) return [pxMap[normalized]];

  const percentMap: Record<string, string> = {
    "25%": `${prefix}-1/4`,
    "33.3333%": `${prefix}-1/3`,
    "50%": `${prefix}-1/2`,
    "66.6667%": `${prefix}-2/3`,
    "75%": `${prefix}-3/4`,
    "100%": `${prefix}-full`,
  };

  if (percentMap[value]) return [percentMap[value]];

  return null;
}

function normalizeNumberish(value: string): string {
  return value.replace(/px$/, "").replace(/\.0$/, "").trim();
}

function oneOf(value: string, map: Record<string, string[]>): string[] | null {
  return map[value] ?? null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function locationHint(attr: JsxAttribute): string {
  const sourceFile = attr.getSourceFile();
  const pos = sourceFile.getLineAndColumnAtPos(attr.getPos());
  return `${relative(sourceFile.getFilePath())}:${pos.line}`;
}

function printReport(report: FileReport[]): void {
  const changed = report.filter((r) => r.changed);
  const unchanged = report.length - changed.length;

  console.log(`Scanned: ${report.length} files`);
  console.log(`Changed: ${changed.length}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Class updates: ${changed.reduce((n, r) => n + r.classUpdates, 0)}`);
  console.log(
    `Inline style conversions: ${changed.reduce((n, r) => n + r.styleConversions, 0)}`
  );
  console.log(`Table upgrades: ${changed.reduce((n, r) => n + r.tableUpgrades, 0)}`);

  if (!changed.length) return;

  console.log("\nChanged files:");
  for (const item of changed) {
    console.log(`- ${item.filePath}`);
    if (item.classUpdates) console.log(`    class updates: ${item.classUpdates}`);
    if (item.styleConversions) {
      console.log(`    style conversions: ${item.styleConversions}`);
    }
    if (item.tableUpgrades) console.log(`    table upgrades: ${item.tableUpgrades}`);
    for (const todo of item.todos) {
      console.log(`    TODO: ${todo}`);
    }
  }
}
