import fs from 'fs'
import path from 'path'
import type { BusinessData, PaletteData } from './theme';
import { applyTheme } from './theme'
interface PurchaseEmailParams {
  payment_method: string
  products: { title: string; price: number }[]
  subtotal: number
  finalTotal: number
  saleId?: string | number
  saleDate?: Date
  buyerName?: string
  buyerEmail?: string
  business?: BusinessData | null
  palette?: PaletteData | null
}
export function purchase_email_html(params: PurchaseEmailParams) {
  const tplPath = path.join(__dirname, './files/purchase_email.hbs')
  let html = fs.readFileSync(tplPath, 'utf-8')
  const safeBuyerName = params.buyerName?.trim() ? params.buyerName : 'N/A'
  const safeBuyerEmail = params.buyerEmail?.trim() ? params.buyerEmail : 'N/A'
  const saleDateStr = params.saleDate ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(params.saleDate) : new Date().toLocaleString('es-AR')
  const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
  const productsRows = (Array.isArray(params.products) ? params.products : [])
    .map(p => `
      <tr style="border-top:1px solid {{color_text_muted}};">
        <td style="padding:10px 12px; font-size:14px; color:{{color_text_main}};">${p.title}</td>
        <td style="padding:10px 12px; font-size:14px; color:{{color_text_main}}; text-align:right;">${currency.format(Number(p.price) || 0)}</td>
      </tr>
    `)
    .join('')
  html = html.replace(/\{\{sale_id\}\}/g, String(params.saleId ?? 'N/A'))
  html = html.replace(/\{\{sale_date\}\}/g, saleDateStr)
  html = html.replace(/\{\{buyer_name\}\}/g, safeBuyerName)
  html = html.replace(/\{\{buyer_email\}\}/g, safeBuyerEmail)
  html = html.replace(/\{\{payment_method\}\}/g, String(params.payment_method))
  html = html.replace(/\{\{products_list\}\}/g, productsRows || '<tr><td style="padding:10px 12px; color:{{color_text_muted}};" colspan="2">Sin productos</td></tr>')
  html = html.replace(/\{\{subtotal\}\}/g, currency.format(Number(params.subtotal) || 0))
  html = html.replace(/\{\{final_total\}\}/g, currency.format(Number(params.finalTotal) || 0))
  return applyTheme(html, params.business, params.palette)
}
