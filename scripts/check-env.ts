import { appEnvRequirements } from "../packages/contracts/src/server";

type AppName = keyof typeof appEnvRequirements;

const app = process.argv[2] as AppName | undefined;

if (!app || !(app in appEnvRequirements)) {
  console.error("Usage: tsx scripts/check-env.ts <web|portal|worker>");
  process.exit(1);
}

const missing = appEnvRequirements[app].filter((name) => !process.env[name]?.trim());

if (missing.length === 0) {
  console.log(`All required ${app} environment variables are present.`);
  process.exit(0);
}

console.error(`Missing required ${app} environment variables:`);
for (const name of missing) {
  console.error(`- ${name}`);
}

process.exit(1);
