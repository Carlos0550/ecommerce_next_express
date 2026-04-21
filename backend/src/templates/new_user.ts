import fs from 'fs';
import path from 'path';
import type { BusinessData, PaletteData } from './theme';
import { applyTheme } from './theme';
export function new_user_html(
    name: string,
    text: string,
    business?: BusinessData | null,
    palette?: PaletteData | null
) {
    const tplPath = path.join(__dirname, './files/new_user.hbs');
    let html = fs.readFileSync(tplPath, 'utf-8');
    const safeName = name && name.trim() ? name : 'Usuario';
    html = html.replace(/\{\{name\}\}/g, safeName);
    html = html.replace(/\{\{text_message\}\}/g, text);
    return applyTheme(html, business, palette);
}
