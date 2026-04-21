export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('549')) {
    return '+' + cleaned;
  }
  if (cleaned.startsWith('54')) {
    return '+' + cleaned;
  }
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return '+549' + cleaned;
  }
  if (cleaned.length === 13 && /^\d+$/.test(cleaned) && cleaned.startsWith('549')) {
    return '+' + cleaned;
  }
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}
export function normalizeRemitentsList(remitents: string): string {
  return remitents
    .split(',')
    .map(r => r.trim())
    .filter(Boolean)
    .map(r => normalizePhoneNumber(r))
    .join(',');
}
export function normalizePhoneForComparison(phone: string): string {
  return phone.replace(/\D/g, '');
}
export function isPhoneAllowed(phone: string, allowedRemitents: string | null): boolean {
  if (!allowedRemitents) {
    return true; 
  }
  const allowedList = allowedRemitents
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
  if (allowedList.length === 0) {
    return true;
  }
  const normalizedPhone = normalizePhoneForComparison(phone);
  return allowedList.some(r => normalizePhoneForComparison(r) === normalizedPhone);
}
