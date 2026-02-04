import fs from 'fs';
import path from 'path';
import { applyTheme, BusinessData, PaletteData } from './theme';
export function order_declined_email_html({ saleId, buyerName, reason, business, palette }: { saleId: string; buyerName?: string; reason: string; business?: BusinessData | null; palette?: PaletteData | null }) {
  const tplPath = path.join(__dirname, './files/order_declined_email.hbs');
  let html = fs.readFileSync(tplPath, 'utf-8');
  const safeName = buyerName && buyerName.trim() ? buyerName : 'Cliente';
  const safeReason = reason && reason.trim() ? reason : 'Motivo no especificado';
  html = html.replace(/\{\{buyer_name\}\}/g, safeName);
  html = html.replace(/\{\{sale_id\}\}/g, String(saleId));
  html = html.replace(/\{\{reason\}\}/g, safeReason);
  return applyTheme(html, business, palette);
}
