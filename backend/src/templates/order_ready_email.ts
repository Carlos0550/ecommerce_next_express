import fs from 'fs';
import path from 'path';
import { applyTheme, BusinessData, PaletteData } from './theme';

export function order_ready_email_html({ saleId, buyerName, payment_method, business, palette }: { saleId: string; buyerName?: string; payment_method: string; business?: BusinessData | null; palette?: PaletteData | null }) {
  const tplPath = path.join(__dirname, './files/order_ready_email.hbs');
  let html = fs.readFileSync(tplPath, 'utf-8');
  const safeName = buyerName && buyerName.trim() ? buyerName : 'Cliente';
  const isLocal = String(payment_method).toUpperCase() === 'EN_LOCAL';
  
  const address = business?.address || 'Av. Roque Gonzales y Roque Sáenz Peña';
  const mapsUrl = 'https://www.google.com/maps/@-27.4622582,-55.7443897,21z?entry=ttu&g_ep=EgoyMDI1MTEzMC4wIKXMDSoASAFQAw%3D%3D'; 
  
  const infoMessage = isLocal
    ? `Tu pedido está listo para ser retirado en nuestro local ubicado en ${address}.`
    : 'Pronto recibirás la información de envío.';
  const actionButton = isLocal
    ? `<div style="text-align:center; margin:22px 0;">
         <a href="${mapsUrl}" target="_blank"
            style="display:inline-block; background:{{color_button_bg}}; color:{{color_button_text}}; text-decoration:none; padding:12px 20px; border-radius:999px; font-weight:600; font-size:14px;">
           Ver en Google Maps
         </a>
       </div>`
    : '';

  html = html.replace(/\{\{buyer_name\}\}/g, safeName);
  html = html.replace(/\{\{sale_id\}\}/g, String(saleId));
  html = html.replace(/\{\{info_message\}\}/g, infoMessage);
  html = html.replace(/\{\{action_button\}\}/g, actionButton);
  
  return applyTheme(html, business, palette);
}
