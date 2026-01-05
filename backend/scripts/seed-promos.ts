

import 'dotenv/config';
import { PrismaClient, PromoType } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dayjs from '../src/config/dayjs';
import { uploadImage } from '../src/config/supabase';

const prisma = new PrismaClient();

const promoTitles = [
  'Descuento Flash',
  'Promo Fin de Semana',
  '2x1 Esencial',
  'Días de Belleza',
  'Semana Cinnamon',
  'Hot Sale',
  'Liquidación Express',
  'Feria de Precios',
  'Promo Estrella',
  'Súper Ahorro'
];

const promoDescriptions = [
  'Aprovecha descuentos por tiempo limitado en productos seleccionados.',
  'Promoción especial en toda la tienda durante el fin de semana.',
  'Obtén más por menos con esta promoción exclusiva.',
  'Descubre ofertas únicas en tus productos favoritos.',
  'Descuentos imperdibles para compras inteligentes.',
  'Precios especiales por alta demanda, ¡no te lo pierdas!',
  'Campaña relámpago con descuentos sorpresivos.',
  'Beneficios especiales para compras superiores a un mínimo.',
  'Ideal para renovar tu stock con ahorro.',
  'Límite de uso por usuario para mantener la equidad.'
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.max(0, Math.min(count, arr.length)));
}

async function readTestImageBuffer(): Promise<Buffer | null> {
  try {
    
    const imgPath = path.resolve(__dirname, '..', '-enIbPNsTdmLfGuLg1AeKA.jpg');
    if (!fs.existsSync(imgPath)) {
      console.warn('⚠️ Imagen de testing no encontrada en:', imgPath);
      return null;
    }
    return fs.readFileSync(imgPath);
  } catch (err) {
    console.warn('⚠️ No se pudo leer la imagen de testing:', err);
    return null;
  }
}

async function seedPromos() {
  try {
    console.log('🔍 Consultando categorías y productos existentes...');

    const categories = await prisma.categories.findMany({
      where: { is_active: true },
      select: { id: true, title: true }
    });

    const products = await prisma.products.findMany({
      where: { is_active: true },
      select: { id: true, title: true }
    });

    console.log(`📂 Categorías activas: ${categories.length}`);
    console.log(`🛒 Productos activos: ${products.length}`);

    const admins = await prisma.user.findMany({
      where: { role: 1, is_active: true },
      select: { id: true, email: true }
    });

    const adminId = admins.length > 0 ? pick(admins).id : undefined;
    if (!adminId) {
      console.log('ℹ️ No se encontró usuario admin activo; las promos se crearán sin creador.');
    } else {
      console.log('👤 Usando adminId para createdById:', adminId);
    }

    
    const testImageBuffer = await readTestImageBuffer();

    const TOTAL = 10;
    console.log(`\n🚀 Generando ${TOTAL} promociones aleatorias...`);

    let created = 0;

    for (let i = 0; i < TOTAL; i++) {
      const title = promoTitles[i % promoTitles.length];
      const description = pick(promoDescriptions);

      
      const type = Math.random() < 0.55 ? PromoType.percentage : PromoType.fixed;
      const value = type === PromoType.percentage ? randInt(5, 50) : randInt(5, 100);

      
      const start = dayjs().subtract(randInt(0, 15), 'day').startOf('day').toDate();
      const end = dayjs(start).add(randInt(7, 20), 'day').endOf('day').toDate();

      
      const usage_limit = Math.random() < 0.6 ? randInt(20, 300) : null;
      const per_user_limit = Math.random() < 0.5 ? randInt(1, 5) : null;
      const min_order_amount = Math.random() < 0.5 ? randInt(50, 300) : null;
      const max_discount = type === PromoType.percentage && Math.random() < 0.5 ? randInt(50, 200) : null;

      const is_active = Math.random() < 0.85;
      const show_in_home = Math.random() < 0.4;

      
      const useAllCategories = categories.length > 0 ? Math.random() < 0.25 : false;
      const useAllProducts = products.length > 0 ? Math.random() < 0.25 : false;

      const selectedCategories = !useAllCategories ? pickMany(categories.map(c => c.id), randInt(0, Math.min(3, categories.length))) : [];
      const selectedProducts = !useAllProducts ? pickMany(products.map(p => p.id), randInt(0, Math.min(5, products.length))) : [];

      
      let imageUrl: string | undefined = undefined;
      if (testImageBuffer) {
        const fileName = `seed-promo-${Date.now()}-${i}.jpg`;
        const rs = await uploadImage(testImageBuffer, fileName, 'promos', 'image/jpeg');
        if (rs.url) imageUrl = rs.url || undefined;
      }

      const code = `${title.slice(0, 4).toUpperCase()}-${Date.now()}-${i}`;

      await prisma.promos.create({
        data: {
          code,
          title: title.toLowerCase(),
          description,
          image: imageUrl,
          type,
          value,
          max_discount: max_discount ?? undefined,
          min_order_amount: min_order_amount ?? undefined,
          start_date: start,
          end_date: end,
          is_active,
          usage_limit: usage_limit ?? undefined,
          per_user_limit: per_user_limit ?? undefined,
          show_in_home,
          all_categories: useAllCategories,
          all_products: useAllProducts,
          createdById: adminId,
          categories: selectedCategories.length > 0 ? { connect: selectedCategories.map(id => ({ id })) } : undefined,
          products: selectedProducts.length > 0 ? { connect: selectedProducts.map(id => ({ id })) } : undefined,
        }
      });

      created++;
      console.log(`   ✅ Promo ${i + 1}/${TOTAL} creada: ${code} (${type})`);
    }

    console.log('\n🎉 ¡Seed de promociones completado!');
    console.log(`📊 Total creadas: ${created}/${TOTAL}`);
  } catch (error) {
    console.error('❌ Error al generar promociones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedPromos();
}

export { seedPromos };