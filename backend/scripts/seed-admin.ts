import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/config/prisma";

const SEED = {
  email: "carlospelinski03@gmail.com",
  name: "carlos",
  password: "admin123456",
  role: "ADMIN" as const,
};

async function main() {
  const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS
    ? Number(process.env.BCRYPT_SALT_ROUNDS)
    : 10;

  const email = SEED.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`✗ Ya existe un usuario con email ${email} (id=${existing.id}, role=${existing.role}).`);
    console.log("  Si querés resetearlo, eliminá la fila y volvé a correr el script.");
    return;
  }

  const hashed = await bcrypt.hash(SEED.password, await bcrypt.genSalt(SALT_ROUNDS));
  const user = await prisma.user.create({
    data: {
      email,
      name: SEED.name,
      password: hashed,
      role: SEED.role,
      is_active: true,
    },
    select: { id: true, email: true, name: true, role: true, is_active: true },
  });

  console.log("✓ Usuario administrador creado:\n");
  console.log(`  id:        ${user.id}`);
  console.log(`  email:     ${user.email}`);
  console.log(`  name:      ${user.name}`);
  console.log(`  role:      ${user.role}`);
  console.log(`  is_active: ${user.is_active}`);
  console.log(`  password:  ${SEED.password}`);
  console.log("\n  ⚠ Cambiá la contraseña después del primer login.");
}

main()
  .catch((err) => {
    console.error("✗ Error al crear el usuario:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
