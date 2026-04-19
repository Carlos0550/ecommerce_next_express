import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatARS(n: number | string | null | undefined): string {
  if (n == null) return "$ 0";
  const num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "$ 0";
  return "$ " + num.toLocaleString("es-AR");
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
