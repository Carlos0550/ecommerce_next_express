export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') 
    .replace(/[\u0300-\u036f]/g, '') 
    .replace(/\s+/g, '-') 
    .replace(/[^\w\-]+/g, '') 
    .replace(/\-\-+/g, '-') 
    .replace(/^-+/, '') 
    .replace(/-+$/, ''); 
}
export function createProductSlug(title: string, id: string): string {
  return `${slugify(title)}--${id}`;
}
export function extractIdFromSlug(slug?: string | null): string | null {
  if (typeof slug !== "string" || !slug.trim()) {
    return null;
  }
  const parts = slug.split("--");
  const candidate = parts.length > 1 ? parts[parts.length - 1] : slug;
  return candidate?.trim() || null;
}
