import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error", "warn"]
});

async function main() {
  const result = await prisma.teamMember.updateMany({
    where: {
      role: {
        in: [Role.EMPLOYEE, Role.INTERN]
      },
      consentStatus: "ACCEPTED"
    },
    data: {
      consentStatus: "PENDING"
    }
  });

  console.log(`Reset consent on ${result.count} employee membership(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
