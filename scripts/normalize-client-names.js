const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function toUpperNormalized(name) {
  return String(name)
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("es-CO");
}

async function main() {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      fullName: true,
    },
  });

  let updated = 0;

  for (const client of clients) {
    const normalized = toUpperNormalized(client.fullName);
    if (normalized !== client.fullName) {
      await prisma.client.update({
        where: { id: client.id },
        data: { fullName: normalized },
      });
      updated += 1;
    }
  }

  console.log(`Clientes revisados: ${clients.length}`);
  console.log(`Clientes actualizados: ${updated}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Error normalizando nombres:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  });
