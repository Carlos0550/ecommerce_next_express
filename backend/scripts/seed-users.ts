import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ? Number(process.env.BCRYPT_SALT_ROUNDS) : 10;
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Cinnamon#2025';
const TOTAL_USERS = process.env.SEED_USERS ? Number(process.env.SEED_USERS) : 100;

const firstNames = [
  'Sofía','Isabella','Valentina','Camila','Martina','Lucía','Emma','Victoria','Mía','Renata',
  'Juan','Carlos','Mateo','Santiago','Nicolás','Daniel','Gabriel','Lucas','Diego','Tomás',
  'Ana','Carla','Paula','Elena','Julia','Diana','Natalia','Laura','Sara','Noelia',
];

const lastNames = [
  'González','Rodríguez','López','Fernández','Martínez','García','Pérez','Sánchez','Ramírez','Torres',
  'Castro','Romero','Vargas','Morales','Mendoza','Rojas','Navarro','Guerrero','Cruz','Silva',
];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeEmail(first: string, last: string, idx: number): string {
  const f = first.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  const l = last.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  return `${f}.${l}.${idx}@cinnamon-seed.com`;
}

function makeName(first: string, last: string): string {
  return `${first.toLowerCase()} ${last.toLowerCase()}`;
}

function randomRole(): number {
  
  return Math.random() < 0.05 ? 1 : 2;
}

async function seedUsers() {
  try {
    console.log(`🚀 Generando ${TOTAL_USERS} usuarios aleatorios...`);

    const usersData: { email: string; password: string; name: string; role: number }[] = [];

    for (let i = 0; i < TOTAL_USERS; i++) {
      const first = getRandom(firstNames);
      const last = getRandom(lastNames);
      const email = makeEmail(first, last, i);
      const name = makeName(first, last);
      const role = randomRole();

      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const hashed = await bcrypt.hash(DEFAULT_PASSWORD, salt);

      usersData.push({ email, password: hashed, name, role });
    }

    console.log('💾 Insertando usuarios en la base de datos...');
    const result = await prisma.user.createMany({ data: usersData, skipDuplicates: true });

    console.log('\n🎉 ¡Seed de usuarios completado!');
    console.log(`👥 Solicitados: ${TOTAL_USERS}`);
    console.log(`✅ Insertados: ${result.count}`);
    console.log(`🔑 Password por defecto: ${DEFAULT_PASSWORD}`);

    
    console.log('\n📌 Ejemplos de usuarios creados:');
    for (let i = 0; i < Math.min(5, usersData.length); i++) {
      console.log(`   - ${usersData[i].email} | role=${usersData[i].role}`);
    }
  } catch (err) {
    console.error('❌ Error al generar usuarios:', err);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedUsers();
}

export { seedUsers };