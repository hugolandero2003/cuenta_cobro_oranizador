const { PrismaClient } = require("@prisma/client");

async function main() {
  const required = ["DATABASE_URL", "AUTH_USERNAME", "AUTH_PASSWORD", "AUTH_SECRET"];
  const missing = required.filter((key) => !process.env[key] || process.env[key].trim() === "");

  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [clients, loans, payments] = await Promise.all([
      prisma.client.count(),
      prisma.loan.count(),
      prisma.payment.count(),
    ]);

    console.log("Local check OK.");
    console.log(`Clientes: ${clients}`);
    console.log(`Prestamos: ${loans}`);
    console.log(`Pagos: ${payments}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Error en local:check:", error.message);
  process.exit(1);
});
