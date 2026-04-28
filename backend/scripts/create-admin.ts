import "dotenv/config";
import bcrypt from "bcryptjs";
import readline from "node:readline";
import { prisma } from "@/config/prisma";

const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS
  ? Number(process.env.BCRYPT_SALT_ROUNDS)
  : 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ask(rl: readline.Interface, question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(question, (answer) => resolve(answer));
      return;
    }
    const rlAny = rl as any;
    const origWrite = rlAny._writeToOutput?.bind(rl);
    let muted = false;
    rlAny._writeToOutput = (chunk: string) => {
      if (!muted) {
        rl.output.write(chunk);
        return;
      }
      if (typeof chunk === "string" && chunk.length > 0 && chunk !== "\n" && chunk !== "\r\n") {
        rl.output.write("*");
      }
    };
    rl.question(question, (answer) => {
      rlAny._writeToOutput = origWrite;
      rl.output.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function askRequired(
  rl: readline.Interface,
  label: string,
  validate: (v: string) => string | null,
  hidden = false,
): Promise<string> {
  for (;;) {
    const raw = (await ask(rl, label, hidden)).trim();
    const error = validate(raw);
    if (!error) return raw;
    console.log(`  ✗ ${error}`);
  }
}

async function askOptional(rl: readline.Interface, label: string): Promise<string | undefined> {
  const raw = (await ask(rl, label)).trim();
  return raw.length > 0 ? raw : undefined;
}

async function askConfirm(rl: readline.Interface, label: string): Promise<boolean> {
  const raw = (await ask(rl, label)).trim().toLowerCase();
  return raw === "s" || raw === "si" || raw === "sí" || raw === "y" || raw === "yes";
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("👤 Crear usuario administrador\n");

    const email = await askRequired(
      rl,
      "Email: ",
      (v) => (EMAIL_RE.test(v) ? null : "Email inválido"),
    );
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      console.log(`\n✗ Ya existe un usuario con ese email (id=${existing.id}, role=${existing.role}).`);
      return;
    }

    const name = await askRequired(
      rl,
      "Nombre completo: ",
      (v) => (v.length >= 2 ? null : "Nombre demasiado corto"),
    );

    const password = await askRequired(
      rl,
      "Contraseña (mín. 8 caracteres): ",
      (v) => (v.length >= 8 ? null : "Mínimo 8 caracteres"),
      true,
    );
    const confirm = await askRequired(
      rl,
      "Repetir contraseña: ",
      (v) => (v.length > 0 ? null : "Requerido"),
      true,
    );
    if (password !== confirm) {
      console.log("\n✗ Las contraseñas no coinciden.");
      return;
    }

    const phone = await askOptional(rl, "Teléfono (opcional): ");
    const shipping_street = await askOptional(rl, "Calle (opcional): ");
    const shipping_city = await askOptional(rl, "Ciudad (opcional): ");
    const shipping_postal_code = await askOptional(rl, "Código postal (opcional): ");
    const shipping_province = await askOptional(rl, "Provincia (opcional): ");

    console.log("\nResumen:");
    console.log(`  email:    ${email.toLowerCase()}`);
    console.log(`  name:     ${name}`);
    console.log(`  role:     ADMIN`);
    if (phone) console.log(`  phone:    ${phone}`);
    if (shipping_street) console.log(`  calle:    ${shipping_street}`);
    if (shipping_city) console.log(`  ciudad:   ${shipping_city}`);
    if (shipping_postal_code) console.log(`  cp:       ${shipping_postal_code}`);
    if (shipping_province) console.log(`  prov:     ${shipping_province}`);
    console.log("");

    const ok = await askConfirm(rl, "¿Confirmar creación? (s/N): ");
    if (!ok) {
      console.log("\nCancelado.");
      return;
    }

    const hashed = await bcrypt.hash(password, await bcrypt.genSalt(SALT_ROUNDS));
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashed,
        role: "ADMIN",
        phone,
        shipping_street,
        shipping_city,
        shipping_postal_code,
        shipping_province,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    console.log(`\n✓ Administrador creado:`);
    console.log(`  id:    ${user.id}`);
    console.log(`  email: ${user.email}`);
    console.log(`  role:  ${user.role}`);
  } catch (err) {
    console.error("\n✗ Error al crear el administrador:", err);
    process.exitCode = 1;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
