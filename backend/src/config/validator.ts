import validator from 'validator';
export function isEmailValid(email: string): boolean {
  return validator.isEmail(email);
}
export function normalizeEmail(email: string): string {
  const normalized = validator.normalizeEmail(email);
  return typeof normalized === 'string' ? normalized : email.toLowerCase();
}
export type StrongPasswordOptions = {
  minLength?: number;
  minLowercase?: number;
  minUppercase?: number;
  minNumbers?: number;
  minSymbols?: number;
};
export function isStrongPassword(
  password: string,
  opts: StrongPasswordOptions = { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 }
): boolean {
  return validator.isStrongPassword(password, opts);
}
