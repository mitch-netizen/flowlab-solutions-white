import { ensureDemoSeed, prisma } from "../src/index";

async function main() {
  await ensureDemoSeed();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
