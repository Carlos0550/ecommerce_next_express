const { prisma } = require('./src/config/prisma');

async function main() {
  try {
    const biz = await prisma.businessData.findMany();
    console.log('BUSINESS RECORDS:', biz.length);
    if (biz.length > 0) {
      console.log('FIRST RECORD NAME:', biz[0].name);
    }
  } catch (e) {
    console.error('QUERY ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
