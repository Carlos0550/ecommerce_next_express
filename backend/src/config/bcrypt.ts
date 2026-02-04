import bcrypt from 'bcryptjs';
const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ? Number(process.env.BCRYPT_SALT_ROUNDS) : 10;
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}
export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
