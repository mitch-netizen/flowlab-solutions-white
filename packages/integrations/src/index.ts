import crypto from "node:crypto";

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopPosition,
  TabStopType,
  TextRun,
  WidthType
} from "docx";
import Stripe from "stripe";

import type { AutomationBlueprintDescriptor, IntegrationService, IntegrationTestResult } from "@flowlab/contracts";
import { automationBlueprints, serviceLabels } from "@flowlab/contracts";
import { getCanonicalRootDomain, isProductionRuntime } from "@flowlab/contracts/server";

const algorithm = "aes-256-gcm";
const BREVO_API_BASE = "https://api.brevo.com/v3";
const DOCUSEAL_DEFAULT_API_BASE = "https://api.docuseal.com";
const FALLBACK_GREEN = "2D6A2D";
const LIGHT_GREEN = "E8F5E9";
const DARK = "1A1A1A";
const GREY = "555555";
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function cleanText(input: string | null | undefined, fallback = "") {
  return (input || fallback).replace(/\s+/g, " ").trim();
}

function sanitizeHex(input: string | null | undefined, fallback: string) {
  const cleaned = (input || "").replace(/#/g, "").trim();
  return /^[0-9a-fA-F]{6}$/.test(cleaned) ? cleaned.toUpperCase() : fallback;
}

function fieldTag(
  name: string,
  config: {
    type?: "text" | "signature" | "date" | "datenow";
    role?: string;
    readonly?: boolean;
    required?: boolean;
    width?: number;
    height?: number;
  } = {}
) {
  const parts = [name];

  if (config.type && config.type !== "text") {
    parts.push(`type=${config.type}`);
  }

  if (config.role) {
    parts.push(`role=${config.role}`);
  }

  if (config.readonly) {
    parts.push("readonly=true");
  }

  if (config.required === false) {
    parts.push("required=false");
  }

  if (config.width) {
    parts.push(`width=${config.width}`);
  }

  if (config.height) {
    parts.push(`height=${config.height}`);
  }

  return `{{${parts.join(";")}}}`;
}

function heading1(text: string, green: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: green, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: green })]
  });
}

function body(text: string) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GREY })]
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GREY })]
  });
}

function spacer(size = 160) {
  return new Paragraph({ spacing: { before: size, after: 0 }, children: [new TextRun("")] });
}

function infoRow(label: string, value: string, shade: string) {
  return new TableRow({
    children: [
      new TableCell({
        borders,
        shading: { fill: shade, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 160, right: 160 },
        width: { size: 2400, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: label, font: "Arial", size: 19, bold: true, color: DARK })] })]
      }),
      new TableCell({
        borders,
        shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 160, right: 160 },
        width: { size: 6626, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: value, font: "Arial", size: 19, color: GREY })] })]
      })
    ]
  });
}

function signatureCell(label: string, tag: string) {
  return new TableCell({
    borders: noBorders,
    width: { size: 4313, type: WidthType.DXA },
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
        children: [new TextRun({ text: tag, font: "Arial", size: 20, color: GREY })]
      }),
      new Paragraph({
        spacing: { before: 60 },
        children: [new TextRun({ text: label, font: "Arial", size: 18, color: GREY })]
      })
    ]
  });
}

export async function generateServiceAgreementTemplateDocx(input: {
  businessName: string;
  primaryColour?: string | null;
  abn?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  signerMode?: "customer_only" | "customer_and_business";
}) {
  const green = sanitizeHex(input.primaryColour, FALLBACK_GREEN);
  const businessName = cleanText(input.businessName, "FlowLab Service Business");
  const businessAddress = [input.address, input.suburb, input.state, input.postcode].filter(Boolean).join(", ") || "[Insert business address]";
  const businessEmail = cleanText(input.email, "[Insert email]");
  const businessPhone = cleanText(input.phone, "[Insert phone]");
  const businessAbn = cleanText(input.abn, "[Insert ABN]");
  const signerMode = input.signerMode ?? "customer_only";
  const includeCountersign = signerMode === "customer_and_business";

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } }
            }
          ]
        }
      ]
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: green, space: 4 } },
                spacing: { after: 100 },
                children: [
                  new TextRun({ text: businessName.toUpperCase(), font: "Arial", size: 22, bold: true, color: green }),
                  new TextRun({ text: "   |   Service Agreement", font: "Arial", size: 20, color: GREY })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 4 } },
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                spacing: { before: 80 },
                children: [
                  new TextRun({ text: `${businessName} - Confidential`, font: "Arial", size: 16, color: "AAAAAA" }),
                  new TextRun({ text: "\tPage ", font: "Arial", size: 16, color: "AAAAAA" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "AAAAAA" }),
                  new TextRun({ text: " of ", font: "Arial", size: 16, color: "AAAAAA" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: "AAAAAA" })
                ]
              })
            ]
          })
        },
        children: [
          spacer(200),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [9026],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorders,
                    shading: { fill: green, type: ShadingType.CLEAR },
                    margins: { top: 280, bottom: 280, left: 400, right: 400 },
                    width: { size: 9026, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: businessName.toUpperCase(), font: "Arial", size: 38, bold: true, color: "FFFFFF" })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 80 },
                        children: [new TextRun({ text: "SERVICE AGREEMENT", font: "Arial", size: 28, color: "DDFFDD" })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          spacer(240),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [4413, 200, 4413],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR },
                    margins: { top: 140, bottom: 140, left: 200, right: 200 },
                    width: { size: 4413, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "SERVICE PROVIDER", font: "Arial", size: 17, bold: true, color: green })] }),
                      new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: businessName, font: "Arial", size: 22, bold: true, color: DARK })] }),
                      new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: `ABN: ${businessAbn}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Phone: ${businessPhone}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Email: ${businessEmail}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Address: ${businessAddress}`, font: "Arial", size: 19, color: GREY })] })
                    ]
                  }),
                  new TableCell({
                    borders: noBorders,
                    width: { size: 200, type: WidthType.DXA },
                    children: [new Paragraph({ children: [new TextRun("")] })]
                  }),
                  new TableCell({
                    borders,
                    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                    margins: { top: 140, bottom: 140, left: 200, right: 200 },
                    width: { size: 4413, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "CLIENT", font: "Arial", size: 17, bold: true, color: green })] }),
                      new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: `Name: ${fieldTag("customer_name", { role: "Customer", readonly: true, width: 280 })}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: `Address: ${fieldTag("customer_address", { role: "Customer", readonly: true, width: 300 })}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Suburb: ${fieldTag("customer_suburb", { role: "Customer", readonly: true, width: 180 })}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Phone: ${fieldTag("customer_phone", { role: "Customer", readonly: true, width: 220, required: false })}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Email: ${fieldTag("customer_email", { role: "Customer", readonly: true, width: 260 })}`, font: "Arial", size: 19, color: GREY })] })
                    ]
                  })
                ]
              })
            ]
          }),
          spacer(120),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 80 },
            children: [
              new TextRun({
                text: `Agreement Date: ${fieldTag("agreement_date", { role: "Customer", type: "datenow", readonly: true, width: 180 })}     Commencement Date: ${fieldTag("commencement_date", {
                  role: "Customer",
                  readonly: true,
                  width: 180,
                  required: false
                })}`,
                font: "Arial",
                size: 18,
                color: GREY
              })
            ]
          }),
          heading1("1. Services", green),
          body("The service provider agrees to provide the following services at the client property listed above."),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [9026],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR },
                    margins: { top: 120, bottom: 120, left: 200, right: 200 },
                    width: { size: 9026, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "Quoted Service", font: "Arial", size: 20, bold: true, color: green })] }),
                      new Paragraph({
                        spacing: { before: 80 },
                        children: [new TextRun({ text: fieldTag("service_summary", { role: "Customer", readonly: true, width: 560, height: 48 }), font: "Arial", size: 19, color: GREY })]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    shading: { fill: "F9F9F9", type: ShadingType.CLEAR },
                    margins: { top: 120, bottom: 120, left: 200, right: 200 },
                    width: { size: 9026, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "Scope Notes", font: "Arial", size: 20, bold: true, color: DARK })] }),
                      new Paragraph({
                        spacing: { before: 80 },
                        children: [new TextRun({ text: fieldTag("quote_scope", { role: "Customer", readonly: true, width: 560, height: 96, required: false }), font: "Arial", size: 19, color: GREY })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          spacer(160),
          heading1("2. Service Schedule & Access", green),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [2600, 6426],
            rows: [
              infoRow("Frequency", fieldTag("service_frequency", { role: "Customer", readonly: true, width: 240, required: false }), LIGHT_GREEN),
              infoRow("Preferred Day", fieldTag("preferred_day", { role: "Customer", readonly: true, width: 240, required: false }), "F9F9F9"),
              infoRow("Property Access", "Client to ensure the property is accessible on scheduled days", LIGHT_GREEN)
            ]
          }),
          body("The client must ensure gates are unlocked, pets are secured, and the lawn area is clear of obstacles prior to each visit."),
          spacer(160),
          heading1("3. Pricing & Payment", green),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [2600, 6426],
            rows: [
              infoRow("Service Fee", fieldTag("quote_amount", { role: "Customer", readonly: true, width: 220 }), LIGHT_GREEN),
              infoRow("Payment Due", "Within 7 days of invoice", "F9F9F9"),
              infoRow("Payment Method", "EFT / Bank transfer - details on invoice", LIGHT_GREEN)
            ]
          }),
          body("Invoices will be issued by email following each service. Prices may be reviewed with at least 14 days written notice."),
          spacer(160),
          heading1("4. Cancellations & Rescheduling", green),
          bullet("A minimum of 24 hours notice is required to cancel or reschedule a service."),
          bullet("Late cancellations may incur a fee of up to 50% of the scheduled service cost."),
          bullet("If the service provider is unable to attend due to weather or other unforeseen circumstances, the service will be rescheduled at no additional charge."),
          spacer(160),
          heading1("5. Client Obligations", green),
          bullet("Ensure clear and safe access to the property on all scheduled service days."),
          bullet("Remove or advise of any obstacles or hazards on the lawn prior to each visit, including toys, hoses, tools, and pet waste."),
          bullet("Notify the service provider of any underground irrigation systems, cables, or other subsurface hazards."),
          bullet("Ensure all pets are secured away from the work area during the service."),
          spacer(160),
          heading1("6. Quality & Complaints", green),
          bullet("If the client is not satisfied with the standard of service, they must notify the service provider within 24 hours of the service being completed."),
          bullet("The service provider will attend to any genuine concerns promptly and at no additional charge."),
          spacer(160),
          heading1("7. Liability & Insurance", green),
          bullet("The service provider holds current public liability insurance and can provide proof of currency on request."),
          bullet("The service provider will not be liable for damage caused by pre-existing conditions or undisclosed hazards."),
          bullet("The client accepts responsibility for ensuring the property is safe for service personnel."),
          spacer(160),
          heading1("8. Term & Termination", green),
          bullet("This agreement commences on the date recorded above and continues until terminated by either party."),
          bullet("Either party may terminate this agreement by providing 14 days written notice."),
          bullet("Termination does not affect any outstanding payment obligations."),
          spacer(160),
          heading1("9. General", green),
          bullet("This agreement is governed by the laws of the relevant Australian state or territory where the service is delivered."),
          bullet("Any amendments to this agreement must be agreed in writing by both parties."),
          bullet("If any provision of this agreement is found to be unenforceable, the remaining provisions continue in full force."),
          spacer(200),
          heading1("10. Agreement & Signatures", green),
          body("By signing below, both parties confirm they have read, understood, and agreed to the terms of this service agreement."),
          spacer(240),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: includeCountersign ? [4313, 400, 4313] : [9026],
            rows: [
              new TableRow({
                children: includeCountersign
                  ? [
                      signatureCell("Signature - Business", fieldTag("business_signature", { type: "signature", role: "Business", width: 220 })),
                      new TableCell({
                        borders: noBorders,
                        width: { size: 400, type: WidthType.DXA },
                        children: [new Paragraph({ children: [new TextRun("")] })]
                      }),
                      signatureCell("Signature - Client", fieldTag("customer_signature", { type: "signature", role: "Customer", width: 220 }))
                    ]
                  : [
                      new TableCell({
                        borders: noBorders,
                        width: { size: 9026, type: WidthType.DXA },
                        children: [
                          new Paragraph({
                            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
                            children: [new TextRun({ text: fieldTag("customer_signature", { type: "signature", role: "Customer", width: 220 }), font: "Arial", size: 20, color: GREY })]
                          }),
                          new Paragraph({
                            spacing: { before: 60 },
                            children: [new TextRun({ text: "Signature - Client", font: "Arial", size: 18, color: GREY })]
                          })
                        ]
                      })
                    ]
              }),
              new TableRow({
                children: includeCountersign
                  ? [
                      signatureCell("Name (Print)", fieldTag("business_signer_name", { role: "Business", readonly: true, width: 220, required: false })),
                      new TableCell({
                        borders: noBorders,
                        width: { size: 400, type: WidthType.DXA },
                        children: [new Paragraph({ children: [new TextRun("")] })]
                      }),
                      signatureCell("Name (Print)", fieldTag("customer_full_name", { role: "Customer", readonly: true, width: 220 }))
                    ]
                  : [
                      new TableCell({
                        borders: noBorders,
                        width: { size: 9026, type: WidthType.DXA },
                        children: [
                          new Paragraph({
                            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
                            children: [new TextRun({ text: fieldTag("customer_full_name", { role: "Customer", readonly: true, width: 220 }), font: "Arial", size: 20, color: GREY })]
                          }),
                          new Paragraph({
                            spacing: { before: 60 },
                            children: [new TextRun({ text: "Name (Print)", font: "Arial", size: 18, color: GREY })]
                          })
                        ]
                      })
                    ]
              }),
              new TableRow({
                children: includeCountersign
                  ? [
                      signatureCell("Date", fieldTag("business_signed_at", { type: "datenow", role: "Business", readonly: true, width: 220, required: false })),
                      new TableCell({
                        borders: noBorders,
                        width: { size: 400, type: WidthType.DXA },
                        children: [new Paragraph({ children: [new TextRun("")] })]
                      }),
                      signatureCell("Date", fieldTag("customer_signed_at", { type: "datenow", role: "Customer", readonly: true, width: 220 }))
                    ]
                  : [
                      new TableCell({
                        borders: noBorders,
                        width: { size: 9026, type: WidthType.DXA },
                        children: [
                          new Paragraph({
                            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
                            children: [new TextRun({ text: fieldTag("customer_signed_at", { type: "datenow", role: "Customer", readonly: true, width: 220 }), font: "Arial", size: 20, color: GREY })]
                          }),
                          new Paragraph({
                            spacing: { before: 60 },
                            children: [new TextRun({ text: "Date", font: "Arial", size: 18, color: GREY })]
                          })
                        ]
                      })
                    ]
              })
            ]
          }),
          spacer(240),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160 },
            children: [
              new TextRun({ text: `Thank you for choosing ${businessName}. `, font: "Arial", size: 20, bold: true, color: green }),
              new TextRun({ text: "We look forward to keeping your property looking its best.", font: "Arial", size: 20, color: GREY })
            ]
          })
        ]
      }
    ]
  });

  return Packer.toBuffer(doc);
}

function getMasterKey() {
  const source = process.env.ENCRYPTION_MASTER_KEY;

  if (!source && isProductionRuntime()) {
    throw new Error("ENCRYPTION_MASTER_KEY is required in production");
  }

  // PBKDF2 with a fixed salt — proper key stretching over the legacy SHA256 hash.
  // Salt is non-secret and deterministic so no per-record storage is needed.
  return crypto.pbkdf2Sync(
    source ?? "development-master-key",
    "flowlab-encryption-v1",
    100_000,
    32,
    "sha256"
  );
}

/** Legacy key used before PBKDF2 migration — retained for decrypting old records. */
function getLegacyMasterKey() {
  const source = process.env.ENCRYPTION_MASTER_KEY;
  return crypto.createHash("sha256").update(source ?? "development-master-key").digest();
}

function decryptBuffer(buffer: Buffer, key: Buffer): string {
  const iv = buffer.subarray(0, 16);
  const authTag = buffer.subarray(16, 32);
  const encrypted = buffer.subarray(32);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function encryptJson(payload: Record<string, string>) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, getMasterKey(), iv);
  const serialized = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptJson(input: string | null | undefined): Record<string, string> {
  if (!input) {
    return {};
  }

  const buffer = Buffer.from(input, "base64");

  // Try current PBKDF2 key first, then fall back to legacy SHA256 key for old records.
  for (const key of [getMasterKey(), getLegacyMasterKey()]) {
    try {
      const decrypted = decryptBuffer(buffer, key);
      return JSON.parse(decrypted) as Record<string, string>;
    } catch {
      // Try next key
    }
  }

  return {};
}

export function getDocuSealApiBaseUrl() {
  return (process.env.DOCUSEAL_API_BASE_URL || DOCUSEAL_DEFAULT_API_BASE).replace(/\/+$/, "");
}

function getDocuSealApiUrl(path: string) {
  return `${getDocuSealApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function getDocuSealAppBaseUrl() {
  if (process.env.DOCUSEAL_APP_BASE_URL) {
    return process.env.DOCUSEAL_APP_BASE_URL.replace(/\/+$/, "");
  }

  const apiBase = getDocuSealApiBaseUrl();

  if (apiBase === "https://api.docuseal.com") {
    return "https://docuseal.com";
  }

  if (apiBase === "https://api.docuseal.eu") {
    return "https://docuseal.eu";
  }

  try {
    const url = new URL(apiBase);
    if (url.hostname.startsWith("api.")) {
      url.hostname = url.hostname.replace(/^api\./, "");
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://docuseal.com";
  }
}

function toBase64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signHs256Jwt(payload: Record<string, unknown>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest();
  return `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`;
}

export const integrationHelpText: Record<IntegrationService, string> = {
  twilio: "Send transactional SMS confirmations, reminders, and ETA updates through Brevo.",
  sendgrid: "Deliver branded transactional emails and invoices through Brevo.",
  stripe: "Platform-level payment tooling only. Tenant invoicing is handled through Xero.",
  docuseal: "Send agreements for e-signature and track signing completion.",
  google_maps: "Estimate routes, drive times, and map service areas.",
  xero: "Create invoices in Xero and sync invoice status back into FlowLab.",
  make_com: "Push automation triggers to the tenant's own Make.com scenarios.",
  claude: "Use FlowLab-managed AI for quoting, scheduling, and learning."
};

export const integrationFieldDefinitions: Record<
  IntegrationService,
  Array<{ name: string; label: string; placeholder: string; type?: "text" | "password" | "url" | "email" }>
> = {
  twilio: [
    { name: "apiKey", label: "Brevo API key", placeholder: "xkeysib-...", type: "password" },
    { name: "sender", label: "SMS sender", placeholder: "FlowLabSMS" },
    { name: "organisationPrefix", label: "Organisation prefix", placeholder: "LawnOrder" }
  ],
  sendgrid: [
    { name: "apiKey", label: "Brevo API key", placeholder: "xkeysib-...", type: "password" },
    { name: "fromEmail", label: "From email", placeholder: "ops@business.com", type: "email" },
    { name: "fromName", label: "From name", placeholder: "Business name" },
    { name: "sandboxMode", label: "Sandbox mode", placeholder: "true to validate without sending" }
  ],
  stripe: [
    { name: "publishableKey", label: "Publishable key", placeholder: "pk_..." },
    { name: "secretKey", label: "Secret key", placeholder: "sk_...", type: "password" },
    { name: "webhookSecret", label: "Webhook secret", placeholder: "whsec_...", type: "password" }
  ],
  docuseal: [
    { name: "apiKey", label: "API key", placeholder: "DocuSeal API key", type: "password" },
    { name: "webhookSecretKey", label: "Webhook secret header", placeholder: "x-docuseal-secret" },
    { name: "webhookSecretValue", label: "Webhook secret value", placeholder: "shared-secret-value", type: "password" }
  ],
  google_maps: [
    { name: "apiKey", label: "API key", placeholder: "Google Maps API key", type: "password" }
  ],
  xero: [
    { name: "clientId", label: "Client ID", placeholder: "Xero client id" },
    { name: "clientSecret", label: "Client secret", placeholder: "Xero client secret", type: "password" }
  ],
  make_com: automationBlueprints.map((descriptor) => ({
    name: descriptor.webhookKey,
    label: `${descriptor.title} webhook`,
    placeholder: "https://hook.make.com/...",
    type: "url" as const
  })),
  claude: []
};

export async function testIntegration(service: IntegrationService, credentials: Record<string, string>): Promise<IntegrationTestResult> {
  const label = serviceLabels[service];
  const testedAt = new Date().toISOString();

  if (service === "claude") {
    return {
      service,
      ok: true,
      status: "connected",
      message: "FlowLab-managed Claude credits are active for this tenant.",
      testedAt
    };
  }

  if (service === "make_com") {
    const webhookEntries = Object.entries(credentials).filter(
      ([key, value]) => key.toLowerCase().includes("webhook") && value.trim().length > 0
    );
    const invalidWebhook = webhookEntries.find(([, value]) => {
      try {
        const url = new URL(value);
        return url.protocol !== "https:";
      } catch {
        return true;
      }
    });
    const webhookCount = webhookEntries.length;

    if (invalidWebhook) {
      return {
        service,
        ok: false,
        status: "error",
        message: `Webhook URL is invalid for ${invalidWebhook[0]}. Use a full https:// Make.com webhook URL.`,
        testedAt
      };
    }

    const missingWebhookCount = automationBlueprints.length - webhookCount;
    return {
      service,
      ok: webhookCount > 0,
      status: webhookCount > 0 ? "connected" : "error",
      message:
        webhookCount > 0
          ? `${webhookCount} Make.com webhook${webhookCount === 1 ? "" : "s"} configured${missingWebhookCount > 0 ? `, ${missingWebhookCount} still missing.` : "."}`
          : "Add at least one Make.com webhook URL to test connectivity.",
      testedAt
    };
  }

  if (service === "stripe") {
    const secretKey = credentials.secretKey || process.env.STRIPE_SECRET_KEY || "";

    if (!secretKey) {
      return {
        service,
        ok: false,
        status: "error",
        message: "No Stripe secret key is configured.",
        testedAt
      };
    }

    try {
      const stripe = getStripeClient(secretKey);
      const account = await stripe.accounts.retrieve();
      return {
        service,
        ok: true,
        status: "connected",
        message: `Stripe account ${account.id} is reachable.`,
        testedAt
      };
    } catch (error) {
      return {
        service,
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : "Stripe test failed",
        testedAt
      };
    }
  }

  if (service === "docuseal") {
    const apiKey = credentials.apiKey || process.env.DOCUSEAL_API_KEY || "";

    if (!apiKey) {
      return {
        service,
        ok: false,
        status: "error",
        message: "No DocuSeal API key is configured.",
        testedAt
      };
    }

    try {
      const response = await fetch(getDocuSealApiUrl("/submissions?limit=1"), {
        headers: {
          "X-Auth-Token": apiKey
        }
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "DocuSeal account lookup failed");
      }

      return {
        service,
        ok: true,
        status: "connected",
        message: "DocuSeal API is reachable.",
        testedAt
      };
    } catch (error) {
      return {
        service,
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : "DocuSeal test failed",
        testedAt
      };
    }
  }

  if (service === "twilio") {
    const apiKey = credentials.apiKey || process.env.BREVO_API_KEY || "";
    const sender = credentials.sender || process.env.BREVO_SMS_SENDER || "";
    if (!apiKey || !sender) {
      return {
        service,
        ok: false,
        status: "error",
        message: "Brevo API key and SMS sender are required.",
        testedAt
      };
    }
    try {
      const account = await getBrevoAccount(apiKey);
      return {
        service,
        ok: true,
        status: "connected",
        message: `Brevo account "${getBrevoAccountName(account)}" is reachable for SMS sending.`,
        testedAt
      };
    } catch (error) {
      return {
        service,
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : "Brevo SMS credential check failed",
        testedAt
      };
    }
  }

  if (service === "sendgrid") {
    const apiKey = credentials.apiKey || process.env.BREVO_API_KEY || "";
    const fromEmail = credentials.fromEmail || process.env.BREVO_FROM_EMAIL || "";
    if (!apiKey || !fromEmail) {
      return {
        service,
        ok: false,
        status: "error",
        message: "Brevo API key and From Email are required.",
        testedAt
      };
    }
    try {
      const account = await getBrevoAccount(apiKey);
      return {
        service,
        ok: true,
        status: "connected",
        message: `Brevo account "${getBrevoAccountName(account)}" is reachable for transactional email from ${fromEmail}.`,
        testedAt
      };
    } catch (error) {
      return {
        service,
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : "Brevo email credential check failed",
        testedAt
      };
    }
  }

  if (service === "xero") {
    const { accessToken, refreshToken, xeroTenantId } = credentials;
    if (!accessToken || !refreshToken || !xeroTenantId) {
      return {
        service,
        ok: false,
        status: "error",
        message: "Xero is not connected. Use the 'Connect Xero' button to authorise FlowLab.",
        testedAt
      };
    }
    try {
      const { testXeroConnection } = await import("./xero");
      const result = await testXeroConnection({
        clientId: credentials.clientId ?? "",
        clientSecret: credentials.clientSecret ?? "",
        accessToken,
        refreshToken,
        expiresAt: credentials.expiresAt ?? new Date(0).toISOString(),
        xeroTenantId,
        orgName: credentials.orgName
      });
      return {
        service,
        ok: result.ok,
        status: result.ok ? "connected" : "error",
        message: result.ok
          ? `Connected to Xero organisation "${result.orgName ?? credentials.orgName ?? "Unknown"}". Invoices will be created in Xero.`
          : result.error ?? "Xero connection test failed",
        testedAt
      };
    } catch (error) {
      return {
        service,
        ok: false,
        status: "error",
        message: error instanceof Error ? error.message : "Xero test failed",
        testedAt
      };
    }
  }

  const hasValues = Object.values(credentials).some(Boolean);

  return {
    service,
    ok: hasValues,
    status: hasValues ? "connected" : "error",
    message: hasValues ? `${label} credentials look ready for a live connection test.` : `No ${label} credentials were supplied.`,
    testedAt
  };
}

async function getBrevoAccount(apiKey: string) {
  const response = await fetch(`${BREVO_API_BASE}/account`, {
    headers: {
      accept: "application/json",
      "api-key": apiKey
    },
    signal: AbortSignal.timeout(10_000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getBrevoErrorMessage(payload, response.status, "Brevo account lookup failed"));
  }

  return payload as {
    companyName?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

function getBrevoAccountName(account: {
  companyName?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}) {
  return (
    account.companyName ||
    [account.firstName, account.lastName].filter(Boolean).join(" ") ||
    account.email ||
    "your Brevo account"
  );
}

function getBrevoErrorMessage(payload: unknown, status: number, fallback: string) {
  if (payload && typeof payload === "object") {
    const message = "message" in payload ? payload.message : undefined;
    const code = "code" in payload ? payload.code : undefined;

    if (typeof message === "string" && typeof code === "string") {
      return `${message} (${code})`;
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return `${fallback} (${status})`;
}

function normalizeBrevoRecipientPhone(input: string) {
  const digits = input.replace(/\D+/g, "");
  return digits || input.trim();
}

function stripHtml(input: string) {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAutomationBlueprintPayloads(input: {
  tenantSlug: string;
  businessName: string;
  rootDomain?: string;
  descriptors?: AutomationBlueprintDescriptor[];
}) {
  const rootDomain = input.rootDomain ?? getCanonicalRootDomain();
  const baseWebhookUrl = `https://${input.tenantSlug}.${rootDomain}/api/automation`;
  const descriptors = input.descriptors ?? automationBlueprints;

  return descriptors.map((descriptor, index) => {
    const keyName = descriptor.webhookKey.replace(/Url$/, "");
    const body = {
      flowlab_template_version: "v1",
      title: descriptor.title,
      business_name: input.businessName,
      setup_notes: [
        "Replace every {{...}} placeholder with tenant-owned credentials before enabling the scenario.",
        "Import this blueprint into Make.com and connect the trigger module to the provided FlowLab webhook.",
        "The payload examples mirror the current FlowLab public contract and can be extended later."
      ],
      scenario: {
        webhook_url_variable: `{{${descriptor.webhookKey}}}`,
        default_flowlab_webhook: `${baseWebhookUrl}/${keyName}`,
        suggested_schedule: index === 4 || index >= 8 ? "Configure in Make.com scheduler" : "Triggered by FlowLab webhook",
        modules: [
          {
            step: 1,
            app: "FlowLab webhook",
            action: "Receive tenant payload",
            config: {
              url: `${baseWebhookUrl}/${keyName}`,
              tenant_slug: input.tenantSlug
            }
          },
          {
            step: 2,
            app: "Replace with tenant service",
            action: descriptor.description,
            config: {
              credential_placeholder: "{{tenant_credential}}",
              notes: `Connect the tenant's own ${descriptor.title.toLowerCase()} automation in Make.com.`
            }
          }
        ],
        example_payload: {
          tenant_slug: input.tenantSlug,
          business_name: input.businessName,
          event_key: keyName,
          triggered_at: "2026-04-02T09:00:00.000Z",
          customer: {
            name: "Sarah Johnson",
            phone: "+61400111111",
            email: "sarah@example.com"
          },
          job: {
            reference: "QMS-2001",
            service: "Mow & edge",
            suburb: "Tannum Sands"
          }
        }
      }
    };

    return {
      filename: descriptor.filename,
      contents: JSON.stringify(body, null, 2)
    };
  });
}

export function buildDocuSealRequest(input: {
  businessName: string;
  customerName: string;
  customerEmail: string;
  agreementTitle: string;
  accessToken: string;
  rootDomain?: string;
  tenantSlug?: string;
}) {
  const rootDomain = input.rootDomain ?? getCanonicalRootDomain();
  const baseHost = input.tenantSlug ? `https://${input.tenantSlug}.${rootDomain}` : `https://app.${rootDomain}`;

  return {
    provider: "docuseal",
    externalRequestId: `ds_${Math.random().toString(36).slice(2, 10)}`,
    embeddedSignUrl: `${baseHost}/sign/${input.accessToken}`,
    payload: {}
  };
}

export function verifyDocuSealEventSecret(input: {
  expectedHeaderName?: string;
  expectedHeaderValue?: string;
  headers: Headers;
}) {
  if (!input.expectedHeaderName || !input.expectedHeaderValue) {
    return true;
  }

  const actual = input.headers.get(input.expectedHeaderName);
  return actual === input.expectedHeaderValue;
}

function getDocuSealErrorMessage(payload: any, fallback: string) {
  return payload?.message || payload?.error || payload?.errors?.[0]?.message || fallback;
}

export async function createDocuSealTemplateFromFile(input: {
  apiKey: string;
  templateName: string;
  fileName: string;
  mimeType?: string;
  fileBuffer: Buffer;
}) {
  const lowerName = input.fileName.toLowerCase();
  const isDocx =
    lowerName.endsWith(".docx") ||
    input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isPdf = lowerName.endsWith(".pdf") || input.mimeType === "application/pdf";

  if (!isDocx && !isPdf) {
    throw new Error("Only PDF and DOCX agreement templates are supported.");
  }

  const endpoint = isDocx ? "/templates/docx" : "/templates/pdf";
  const response = await fetch(getDocuSealApiUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": input.apiKey
    },
    body: JSON.stringify({
      name: input.templateName,
      file: input.fileBuffer.toString("base64")
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getDocuSealErrorMessage(payload, "DocuSeal template upload failed"));
  }

  return {
    id: String(payload?.id ?? ""),
    slug: payload?.slug ? String(payload.slug) : null,
    payload
  };
}

export async function getDocuSealTemplate(input: {
  apiKey: string;
  templateId: string;
}) {
  const response = await fetch(getDocuSealApiUrl(`/templates/${input.templateId}`), {
    headers: {
      "X-Auth-Token": input.apiKey
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getDocuSealErrorMessage(payload, "DocuSeal template lookup failed"));
  }

  return payload as {
    id: number | string;
    name?: string;
    slug?: string;
    fields?: Array<{ name?: string; type?: string; role?: string }>;
    submitters?: Array<{ name?: string; role?: string; uuid?: string }>;
    author?: { email?: string };
    documents?: Array<{ url?: string; filename?: string }>;
  };
}

export function createDocuSealBuilderToken(input: {
  apiKey: string;
  adminEmail: string;
  integrationEmail?: string;
  templateId: string;
  externalId?: string;
}) {
  return signHs256Jwt(
    {
      user_email: input.adminEmail,
      integration_email: input.integrationEmail,
      template_id: Number.isFinite(Number(input.templateId)) ? Number(input.templateId) : input.templateId,
      external_id: input.externalId ?? `flowlab-template-${input.templateId}`
    },
    input.apiKey
  );
}

export function validateDocuSealTemplateFields(input: {
  fields: Array<{ name?: string; type?: string; role?: string; submitter_uuid?: string }>;
  submitters: Array<{ name?: string; role?: string; uuid?: string }>;
  requiredRoles: string[];
  requiredFields: Array<{ name: string; type: string | string[]; role?: string }>;
}) {
  const submitterRoleByUuid = new Map(
    input.submitters
      .filter((submitter) => submitter.uuid)
      .map((submitter) => [submitter.uuid as string, submitter.role || submitter.name || ""])
  );

  const submitterRoles = new Set(
    input.submitters
      .map((submitter) => submitter.role || submitter.name || "")
      .filter(Boolean)
  );

  const fieldKeys = new Set(
    input.fields.map((field) => {
      const role = field.role || (field.submitter_uuid ? submitterRoleByUuid.get(field.submitter_uuid) : "") || "";
      return `${field.name || ""}::${field.type || ""}::${role}`;
    })
  );

  const missingRoles = input.requiredRoles.filter((role) => !submitterRoles.has(role));
  const missingFields = input.requiredFields.filter((field) => {
    const types = Array.isArray(field.type) ? field.type : [field.type];
    return !types.some((type) => fieldKeys.has(`${field.name}::${type}::${field.role || ""}`));
  });

  return {
    ok: missingRoles.length === 0 && missingFields.length === 0,
    missingRoles,
    missingFields
  };
}

export async function createDocuSealSubmissionFromTemplate(input: {
  apiKey: string;
  templateId: string;
  accessToken: string;
  callbackUrl: string;
  completedRedirectUrl?: string;
  submitters: Array<{
    name: string;
    email: string;
    role: string;
    fields?: Array<{
      name: string;
      defaultValue: string;
      readonly?: boolean;
    }>;
  }>;
}) {
  const response = await fetch(getDocuSealApiUrl("/submissions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": input.apiKey
    },
    body: JSON.stringify({
      template_id: Number.isFinite(Number(input.templateId)) ? Number(input.templateId) : input.templateId,
      send_email: true,
      order: "preserved",
      external_id: input.accessToken,
      webhook_url: input.callbackUrl,
      submitters: input.submitters.map((submitter, index) => ({
        name: submitter.name,
        email: submitter.email,
        role: submitter.role,
        external_id: index === 0 ? input.accessToken : `${input.accessToken}:${submitter.role.toLowerCase()}`,
        completed_redirect_url: index === 0 ? input.completedRedirectUrl : undefined,
        fields: submitter.fields?.map((field) => ({
          name: field.name,
          default_value: field.defaultValue,
          readonly: field.readonly ?? true
        }))
      }))
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getDocuSealErrorMessage(payload, "DocuSeal submission failed"));
  }

  const submitterPayload = Array.isArray(payload) ? payload[0] : payload?.data?.[0]?.submitters?.[0] || payload?.submission?.submitters?.[0] || payload?.submitters?.[0];
  const submission = Array.isArray(payload) ? null : payload?.data?.[0] || payload?.submission || payload;
  const customerSubmitter = submitterPayload || submission?.submitters?.[0];
  const signingUrl =
    customerSubmitter?.embed_src ||
    customerSubmitter?.submission_url ||
    customerSubmitter?.url ||
    (customerSubmitter?.slug ? `${getDocuSealAppBaseUrl()}/s/${customerSubmitter.slug}` : null) ||
    null;

  return {
    id: String(submission?.id ?? customerSubmitter?.submission_id ?? customerSubmitter?.id ?? ""),
    signingUrl: signingUrl ? String(signingUrl) : null,
    payload: Array.isArray(payload) ? { submitter: customerSubmitter } : submission
  };
}

export async function sendDocuSealSignatureRequest(input: {
  apiKey: string;
  businessName: string;
  customerName: string;
  customerEmail: string;
  agreementTitle: string;
  agreementText: string;
  accessToken: string;
  callbackUrl: string;
}) {
  const request = buildDocuSealRequest({
    businessName: input.businessName,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    agreementTitle: input.agreementTitle,
    accessToken: input.accessToken
  });

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 40px; color: #0f172a;">
        <h1>${input.agreementTitle}</h1>
        <p><strong>Business:</strong> ${input.businessName}</p>
        <p><strong>Customer:</strong> ${input.customerName}</p>
        <div style="margin-top: 24px; white-space: pre-wrap;">${input.agreementText}</div>
        <div style="margin-top: 40px;">
          <p><strong>Signature</strong></p>
          <docuseal-signature data-role="Signer 1"></docuseal-signature>
          <docuseal-date data-role="Signer 1"></docuseal-date>
          <docuseal-text data-role="Signer 1" data-name="Full Name"></docuseal-text>
        </div>
      </body>
    </html>
  `;

  const response = await fetch(getDocuSealApiUrl("/submissions/html"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": input.apiKey
    },
    body: JSON.stringify({
      name: input.agreementTitle,
      html,
      send_email: true,
      order: "preserved",
      external_id: input.accessToken,
      submitters: [
        {
          name: input.customerName,
          email: input.customerEmail,
          role: "Signer 1",
          external_id: input.accessToken
        }
      ],
      webhook_url: input.callbackUrl
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.message || payload?.error || "DocuSeal signature request failed";
    throw new Error(message);
  }

  const submission = payload;
  return {
    ...request,
    externalRequestId: String(submission.id ?? request.externalRequestId),
    callbackUrl: input.callbackUrl,
    response: submission
  };
}

export function buildStripePaymentLink(input: {
  tenantSlug: string;
  invoiceToken: string;
  invoiceNumber: string;
  amount: number;
  rootDomain?: string;
}) {
  const rootDomain = input.rootDomain ?? getCanonicalRootDomain();
  const sessionId = `cs_test_${Math.random().toString(36).slice(2, 12)}`;
  const publicUrl = `https://${input.tenantSlug}.${rootDomain}/invoice/${input.invoiceToken}`;

  return {
    provider: "stripe",
    sessionId,
    url: `https://checkout.stripe.com/pay/${sessionId}?invoice=${encodeURIComponent(input.invoiceNumber)}&return_url=${encodeURIComponent(publicUrl)}`,
    metadata: {
      invoiceToken: input.invoiceToken,
      invoiceNumber: input.invoiceNumber,
      amount: input.amount
    }
  };
}

const stripeClients = new Map<string, Stripe>();

export function getStripeClient(secretKey: string) {
  if (!stripeClients.has(secretKey)) {
    stripeClients.set(
      secretKey,
      new Stripe(secretKey, {
        maxNetworkRetries: 1
      })
    );
  }

  return stripeClients.get(secretKey)!;
}

// ---------------------------------------------------------------------------
// Outbound communication helpers
// ---------------------------------------------------------------------------

export function buildBrandedEmailHtml(input: {
  businessName: string;
  logoUrl?: string | null;
  primaryColour?: string | null;
  bodyHtml: string;
  footerText?: string;
}) {
  const colour = input.primaryColour ?? "#3B82F6";
  const logo = input.logoUrl
    ? `<img src="${input.logoUrl}" alt="${input.businessName}" style="max-height:48px; margin-bottom:0;" />`
    : `<span style="font-size:20px; font-weight:700;">${input.businessName}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="background:${colour};padding:24px 32px;text-align:center;color:#ffffff;">
          ${logo}
        </td></tr>
        <tr><td style="padding:32px;color:#0f172a;line-height:1.7;font-size:15px;">
          ${input.bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 32px 24px;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;">
          ${input.footerText ?? `<strong>${input.businessName}</strong>`}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send an SMS via the tenant's configured Brevo account.
 * Throws if credentials are missing or the Brevo API call fails.
 */
export async function sendSms(
  credentials: Record<string, string>,
  to: string,
  body: string
): Promise<void> {
  const apiKey = credentials.apiKey || process.env.BREVO_API_KEY || "";
  const sender = credentials.sender || process.env.BREVO_SMS_SENDER || "";
  const organisationPrefix =
    credentials.organisationPrefix || process.env.BREVO_SMS_ORGANISATION_PREFIX || "";
  if (!apiKey || !sender) {
    throw new Error("Brevo SMS credentials incomplete — apiKey and sender are required");
  }

  const response = await fetch(`${BREVO_API_BASE}/transactionalSMS/send`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender,
      recipient: normalizeBrevoRecipientPhone(to),
      content: body,
      type: "transactional",
      ...(organisationPrefix ? { organisationPrefix } : {})
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getBrevoErrorMessage(payload, response.status, "Brevo SMS send failed"));
  }
}

/**
 * Send a transactional email via the tenant's configured Brevo account.
 * Throws if credentials are missing or the Brevo API call fails.
 */
export async function sendEmail(
  credentials: Record<string, string>,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const apiKey = credentials.apiKey || process.env.BREVO_API_KEY || "";
  const fromEmail = credentials.fromEmail || process.env.BREVO_FROM_EMAIL || "";
  const fromName = credentials.fromName || process.env.BREVO_FROM_NAME || "";
  const sandboxMode = credentials.sandboxMode || process.env.BREVO_SANDBOX_MODE || "";
  if (!apiKey || !fromEmail) {
    throw new Error("Brevo email credentials incomplete — apiKey and fromEmail are required");
  }

  const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        email: fromEmail,
        name: fromName || fromEmail
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: stripHtml(html),
      ...(sandboxMode === "true" ? { headers: { "X-Sib-Sandbox": "drop" } } : {})
    }),
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(getBrevoErrorMessage(payload, response.status, "Brevo email send failed"));
  }
}

/**
 * Fire a Make.com webhook for a given automation key.
 * Returns ok:false (without throwing) when the webhook URL is not configured —
 * the caller decides whether to log a warning or treat it as a hard error.
 */
export async function fireMakeWebhook(
  credentials: Record<string, string>,
  webhookKey: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = credentials[webhookKey];
  if (!url) {
    return { ok: false, status: 0, body: `No webhook URL configured for key: ${webhookKey}` };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000)
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : "Webhook request failed"
    };
  }
}
