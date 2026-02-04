import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const business = await prisma.businessData.findMany({
    include: { bankData: true },
  });
  console.log(JSON.stringify(business, null, 2));
}
main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
