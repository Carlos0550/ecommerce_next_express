import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'


const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurado. Ejecuta validateEnvironmentVariables() primero.');
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL })

export const prisma = new PrismaClient({ adapter })