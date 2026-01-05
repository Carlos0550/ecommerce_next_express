
import 'dotenv/config';
import { PrismaClient, PaymentMethod, SaleSource } from '@prisma/client';

const prisma = new PrismaClient();

const TOTAL_SALES = 1000;
const DAYS_BACK = 120;

type Weighted<T> = { value: T; weight: number };

function pickWeighted<T>(list: Weighted<T>[]): T {
  const sum = list.reduce((acc, item) => acc + item.weight, 0);
  let r = Math.random() * sum;
  for (const item of list) {
    if (r < item.weight) return item.value;
    r -= item.weight;
  }
  return list[list.length - 1].value;
}

function randomDateBetween(start: Date, end: Date): Date {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const ts = startMs + Math.random() * (endMs - startMs);
  return new Date(ts);
}

function randomTotal(): number {
  
  const min = 2000;
  const max = 100000;
  const skew = 0.6; 
  const r = Math.pow(Math.random(), skew);
  const value = min + r * (max - min);
  return Number(value.toFixed(2));
}

async function seedSales() {
  try {
    console.log(`🚀 Generando ${TOTAL_SALES} ventas aleatorias...`);

    const now = new Date();
    const startRange = new Date(now);
    startRange.setDate(startRange.getDate() - DAYS_BACK);

    
    const users = await prisma.user.findMany({ select: { id: true } });
    const userIds = users.map((u) => u.id);

    const paymentDist: Weighted<PaymentMethod>[] = [
      { value: PaymentMethod.EFECTIVO, weight: 0.4 },
      { value: PaymentMethod.TARJETA, weight: 0.35 },
      { value: PaymentMethod.QR, weight: 0.2 },
      { value: PaymentMethod.NINGUNO, weight: 0.05 },
    ];

    const sourceDist: Weighted<SaleSource>[] = [
      { value: SaleSource.CAJA, weight: 0.6 },
      { value: SaleSource.WEB, weight: 0.4 },
    ];

    const salesData: any[] = [];

    for (let i = 0; i < TOTAL_SALES; i++) {
      const payment_method = pickWeighted(paymentDist);
      const source = pickWeighted(sourceDist);
      const created_at = randomDateBetween(startRange, now);
      const total = randomTotal();
      const applyTax = Math.random() < 0.7; 
      const tax = applyTax ? Number((total * 0.21).toFixed(2)) : 0;
      const userId = userIds.length > 0 && Math.random() < 0.7
        ? userIds[Math.floor(Math.random() * userIds.length)]
        : null;

      salesData.push({
        payment_method,
        source,
        total,
        created_at,
        tax,
        userId,
        manualProducts: [],
        loadedManually: false,
        paymentMethods: [],
      });
    }

    console.log('💾 Insertando ventas en la base de datos...');
    const batchSize = 200;
    let inserted = 0;
    for (let i = 0; i < salesData.length; i += batchSize) {
      const batch = salesData.slice(i, i + batchSize);
      const result = await prisma.sales.createMany({ data: batch });
      inserted += result.count;
      console.log(`   ✅ Insertados ${inserted}/${salesData.length}`);
    }

    console.log('\n🎉 ¡Seed de ventas completado!');
    console.log(`📊 Ventas creadas: ${inserted}`);

    
    const pmStats = salesData.reduce((acc, s) => {
      acc[s.payment_method] = (acc[s.payment_method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const srcStats = salesData.reduce((acc, s) => {
      acc[s.source] = (acc[s.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📈 Distribución por método de pago:');
    Object.entries(pmStats).forEach(([k, v]) => console.log(`   - ${k}: ${v}`));
    console.log('\n🏷️  Distribución por origen:');
    Object.entries(srcStats).forEach(([k, v]) => console.log(`   - ${k}: ${v}`));

  } catch (err) {
    console.error('❌ Error al generar ventas:', err);
  } finally {
    await prisma.$disconnect();
  }
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  seedSales();
}

export { seedSales };