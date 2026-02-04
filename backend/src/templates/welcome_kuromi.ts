import fs from "fs";
import path from "path";
import { applyTheme, BusinessData, PaletteData } from "./theme";
export function welcomeKuromiHTML(
  name: string,
  text: string,
  business?: BusinessData | null,
  palette?: PaletteData | null,
) {
  const tplPath = path.join(__dirname, "./files/welcome_kuromi.hbs");
  let html = fs.readFileSync(tplPath, "utf-8");
  const safeName = name && name.trim() ? name : "Usuario";
  html = html.replace(/\{\{name\}\}/g, safeName);
  html = html.replace(/\{\{text_message\}\}/g, text);
  return applyTheme(html, business, palette);
}
