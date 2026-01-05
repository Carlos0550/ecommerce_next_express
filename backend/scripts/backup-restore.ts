
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });
const BACKUP_FILE = path.join(__dirname, 'db-backup.json');

async function backup() {
  console.log('📦 Iniciando backup de la base de datos...');
  
  try {
    
    const businessColumnsRows: { column_name: string }[] = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'BusinessData' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    const businessColumns = businessColumnsRows.map(r => `"${r.column_name}"`).join(', ');
    const businessRaw: any[] = businessColumns
      ? await prisma.$queryRawUnsafe(`SELECT ${businessColumns} FROM "BusinessData"`)
      : [];
    const bankDataAll = await prisma.businessBankData.findMany();
    const businessData = businessRaw.map((row) => ({
      ...row,
      bankData: bankDataAll.filter(b => b.businessId === row.id)
    }));

    const data = {
      users: await prisma.user.findMany(),
      admins: await prisma.admin.findMany(),
      categories: await prisma.categories.findMany(),
      products: await prisma.products.findMany(),
      promos: await prisma.promos.findMany(),
      sales: await prisma.sales.findMany(),
      cart: await prisma.cart.findMany(),
      orderItems: await prisma.orderItems.findMany(),
      orders: await prisma.orders.findMany(),
      faq: await prisma.fAQ.findMany(),
      businessData,
      colorPalette: await prisma.colorPalette.findMany(),
    };

    fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
    console.log(`✅ Backup guardado exitosamente en: ${BACKUP_FILE}`);
    console.log(`📊 Resumen:
      - Users: ${data.users.length}
      - Admins: ${data.admins.length}
      - Products: ${data.products.length}
      - Orders: ${data.orders.length}
      - Business: ${data.businessData.length}
    `);
  } catch (error) {
    console.error('❌ Error durante el backup:', error);
    process.exit(1);
  }
}

async function restore() {
  console.log('♻️ Iniciando restauración de la base de datos...');
  
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('❌ No se encontró archivo de backup');
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));

    
    
    console.log('🧹 Limpiando tablas existentes...');
    await prisma.businessBankData.deleteMany();
    await prisma.businessData.deleteMany();
    await prisma.orderItems.deleteMany();
    await prisma.orders.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.sales.deleteMany();
    await prisma.promos.deleteMany();
    await prisma.products.deleteMany();
    await prisma.categories.deleteMany();
    await prisma.fAQ.deleteMany();
    await prisma.colorPalette.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.user.deleteMany();

    console.log('📥 Insertando datos...');

    
    if (data.users?.length) await prisma.user.createMany({ data: data.users });
    if (data.admins?.length) await prisma.admin.createMany({ data: data.admins });
    if (data.categories?.length) await prisma.categories.createMany({ data: data.categories });
    if (data.products?.length) await prisma.products.createMany({ data: data.products });
    if (data.promos?.length) await prisma.promos.createMany({ data: data.promos });
    if (data.sales?.length) await prisma.sales.createMany({ data: data.sales });
    if (data.cart?.length) await prisma.cart.createMany({ data: data.cart });
    if (data.orderItems?.length) await prisma.orderItems.createMany({ data: data.orderItems });
    if (data.orders?.length) await prisma.orders.createMany({ data: data.orders });
    if (data.faq?.length) await prisma.fAQ.createMany({ data: data.faq });
    if (data.colorPalette?.length) await prisma.colorPalette.createMany({ data: data.colorPalette });
    
    
    if (data.businessData?.length) {
      for (const business of data.businessData) {
        const { bankData, ...businessInfo } = business;
        const bankRows = Array.isArray(bankData)
          ? bankData.map(({ businessId, ...rest }) => rest)
          : [];
        await prisma.businessData.create({
          data: {
            ...businessInfo,
            ...(bankRows.length ? { bankData: { create: bankRows } } : {})
          }
        });
      }
    }

    console.log('✅ Restauración completada exitosamente');
  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
    process.exit(1);
  }
}

async function main() {
  const mode = process.argv[2];
  
  if (mode === '--backup') {
    await backup();
  } else if (mode === '--restore') {
    await restore();
  } else {
    console.log(`
    Uso:
      npx ts-node scripts/backup-restore.ts --backup   (Guardar datos)
      npx ts-node scripts/backup-restore.ts --restore  (Restaurar datos)
    `);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
