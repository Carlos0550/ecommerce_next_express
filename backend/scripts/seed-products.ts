import 'dotenv/config';
import { PrismaClient, ProductState } from '@prisma/client';

const prisma = new PrismaClient();


const productTitles = [
  
  'Base de Maquillaje Líquida', 'Corrector Cremoso', 'Polvo Compacto Matificante', 'Rubor en Polvo',
  'Bronceador Natural', 'Iluminador Dorado', 'Sombras de Ojos Paleta', 'Delineador de Ojos Líquido',
  'Máscara de Pestañas Volumen', 'Lápiz de Cejas', 'Labial Mate', 'Gloss Labial Brillante',
  'Primer Facial', 'Fijador de Maquillaje', 'Contorno en Crema', 'Tinta para Labios',
  
  
  'Limpiador Facial Suave', 'Tónico Hidratante', 'Serum Vitamina C', 'Crema Hidratante Facial',
  'Protector Solar SPF 50', 'Exfoliante Facial', 'Mascarilla Hidratante', 'Contorno de Ojos',
  'Agua Micelar', 'Aceite Desmaquillante', 'Crema Nocturna Reparadora', 'Serum Ácido Hialurónico',
  
  
  'Set de Brochas Profesionales', 'Esponja de Maquillaje', 'Espejo Compacto con Luz', 'Organizador de Maquillaje',
  'Rizador de Pestañas', 'Pinzas para Cejas', 'Aplicadores de Sombras', 'Limpiador de Brochas',
  'Bolsa de Maquillaje Viaje', 'Soporte para Brochas', 'Paleta Mezcladora', 'Atomizador Facial',
  
  
  'Perfume Floral Femenino', 'Eau de Toilette Fresco', 'Body Splash Frutal', 'Perfume Amaderado',
  'Fragancia Cítrica', 'Perfume Oriental', 'Colonia Suave', 'Bruma Corporal Aromática',
  
  
  'Crema Corporal Hidratante', 'Exfoliante Corporal', 'Aceite Corporal Nutritivo', 'Loción Post-Solar',
  'Gel de Ducha Aromático', 'Manteca Corporal', 'Crema para Manos', 'Bálsamo Labial Hidratante',
  
  
  'Esmalte de Uñas Clásico', 'Base Fortalecedora', 'Top Coat Brillante', 'Removedor de Esmalte',
  'Lima de Uñas Profesional', 'Aceite para Cutículas', 'Kit de Manicura', 'Esmalte Gel UV',
  
  
  'Shampoo Hidratante', 'Acondicionador Reparador', 'Mascarilla Capilar', 'Serum Anti-Frizz',
  'Spray Termoprotector', 'Aceite Capilar Nutritivo', 'Champú Seco', 'Tratamiento Capilar Intensivo'
];

const descriptions = [
  'Producto de alta calidad con fórmula innovadora que brinda resultados excepcionales.',
  'Ideal para uso diario, proporciona hidratación y protección duradera.',
  'Fórmula libre de parabenos y sulfatos, perfecta para pieles sensibles.',
  'Textura ligera y de rápida absorción, no deja residuos grasos.',
  'Enriquecido con ingredientes naturales y vitaminas esenciales.',
  'Producto dermatológicamente testado, hipoalergénico y no comedogénico.',
  'Fórmula de larga duración que mantiene su efecto durante todo el día.',
  'Ingredientes premium seleccionados para máxima eficacia y suavidad.',
  'Producto vegano y cruelty-free, respetuoso con el medio ambiente.',
  'Tecnología avanzada que se adapta a las necesidades de tu piel.',
  'Fórmula multifuncional que combina varios beneficios en un solo producto.',
  'Textura cremosa y sedosa que se desliza suavemente sobre la piel.',
  'Producto profesional utilizado por maquilladores expertos.',
  'Fórmula resistente al agua y al sudor, perfecta para cualquier ocasión.',
  'Ingredientes activos que nutren y regeneran la piel desde el interior.'
];

const tags = [
  ['hidratante', 'natural', 'vegano'],
  ['larga duración', 'resistente al agua', 'profesional'],
  ['anti-edad', 'nutritivo', 'reparador'],
  ['matificante', 'oil-free', 'piel grasa'],
  ['sensible', 'hipoalergénico', 'suave'],
  ['luminoso', 'iluminador', 'radiante'],
  ['volumen', 'definición', 'intenso'],
  ['cremoso', 'sedoso', 'confortable'],
  ['orgánico', 'eco-friendly', 'sostenible'],
  ['multifuncional', 'todo-en-uno', 'práctico']
];


function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}


function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}


function generateRandomPrice(): number {
  const prices = [990, 1490, 1990, 2490, 2990, 3490, 3990, 4490, 4990, 5990, 6990, 7990, 8990, 9990];
  return getRandomElement(prices);
}


function generateRandomStock(): number {
  return Math.floor(Math.random() * 100) + 1; 
}


function generateRandomState(): ProductState {
  const states = [
    ProductState.active, ProductState.active, ProductState.active, ProductState.active, 
    ProductState.active, ProductState.active, ProductState.active, ProductState.active,
    ProductState.draft, ProductState.out_stock 
  ];
  return getRandomElement(states);
}

async function seedProducts() {
  try {
    console.log('🔍 Consultando categorías existentes...');
    
    
    const categories = await prisma.categories.findMany({
      where: {
        is_active: true
      },
      select: {
        id: true,
        title: true
      }
    });

    if (categories.length === 0) {
      console.log('❌ No se encontraron categorías activas en la base de datos.');
      console.log('💡 Primero debes crear algunas categorías antes de generar productos.');
      return;
    }

    console.log(`✅ Se encontraron ${categories.length} categorías:`);
    categories.forEach(cat => console.log(`   - ${cat.title} (ID: ${cat.id})`));

    console.log('\n🚀 Generando 100 productos aleatorios...');

    const products = [];
    
    for (let i = 0; i < 10000; i++) {
      const randomCategory = getRandomElement(categories);
      const randomTitle = getRandomElement(productTitles);
      const randomDescription = getRandomElement(descriptions);
      const randomTags = getRandomElements(getRandomElement(tags), Math.floor(Math.random() * 3) + 1);
      const randomPrice = generateRandomPrice();
      const randomStock = generateRandomStock();
      const randomState = generateRandomState();

      const product = {
        title: `${randomTitle} ${i + 1}`,
        description: randomDescription,
        price: randomPrice,
        stock: randomStock,
        state: randomState,
        categoryId: randomCategory.id,
        tags: randomTags,
        images: [], 
        is_active: randomState === ProductState.active || randomState === ProductState.draft
      };

      products.push(product);
    }

    
    console.log('💾 Insertando productos en la base de datos...');
    
    const batchSize = 1000;
    let insertedCount = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      await prisma.products.createMany({
        data: batch
      });
      
      insertedCount += batch.length;
      console.log(`   ✅ Insertados ${insertedCount}/${products.length} productos`);
    }

    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   - Productos creados: ${insertedCount}`);
    console.log(`   - Categorías utilizadas: ${categories.length}`);
    
    
    console.log('\n📈 Distribución por categoría:');
    for (const category of categories) {
      const count = products.filter(p => p.categoryId === category.id).length;
      console.log(`   - ${category.title}: ${count} productos`);
    }

    
    console.log('\n📊 Distribución por estado:');
    const stateStats = products.reduce((acc, product) => {
      acc[product.state] = (acc[product.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(stateStats).forEach(([state, count]) => {
      console.log(`   - ${state}: ${count} productos`);
    });

  } catch (error) {
    console.error('❌ Error al generar productos:', error);
  } finally {
    await prisma.$disconnect();
  }
}


if (require.main === module) {
  seedProducts();
}

export { seedProducts };