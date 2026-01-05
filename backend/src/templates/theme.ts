export type BusinessData = {
  name: string;
  address: string;
  city: string;
  state: string;
  email: string;
  phone: string;
}

export type PaletteData = {
  colors: string[];
}

export function applyTheme(html: string, business?: BusinessData | null, palette?: PaletteData | null) {
  
  const businessName = business?.name || "Tienda online";
  const businessAddress = business?.address || "";
  const businessCity = business?.city || "";
  const businessState = business?.state || "";
  const businessEmail = business?.email || "";
  const businessPhone = business?.phone || "";

  
  
  
  
  const colors = palette?.colors || [
    '#F3E8FF', 
    '#F3E8FF', 
    '#F3E8FF', 
    '#F3E8FF', 
    '#F3E8FF', 
    '#FF6DAA', 
    '#FF6DAA', 
    '#BBBBBB', 
    '#6D28D9', 
    '#2B2B2B'  
  ];

  
  
  
  
  const c = colors;
  
  
  
  
  
  
  
  const bg = c[0]; 
  const headerBg = c[8]; 
  const headerText = c[0]; 
  
  const cardBg = c[1] || '#ffffff'; 
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const replacements: Record<string, string> = {
    '{{color_bg}}': c[0],
    '{{color_header_bg}}': c[8],
    '{{color_header_text}}': '#FFFFFF', 
    '{{color_card_bg}}': '#FFFFFF', 
    '{{color_inner_card_bg}}': c[0], 
    '{{color_primary}}': c[6],
    '{{color_text_main}}': c[9],
    '{{color_text_muted}}': c[7],
    '{{color_button_bg}}': c[8], 
    '{{color_button_text}}': '#FFFFFF',
    '{{color_footer_bg}}': c[9],
    '{{color_footer_text}}': c[2] || '#CCCCCC',
    '{{color_table_header_bg}}': c[2],
    
    '{{business_name}}': businessName,
    '{{business_address}}': businessAddress,
    '{{business_city}}': businessCity,
    '{{business_state}}': businessState,
    '{{business_email}}': businessEmail,
    '{{business_phone}}': businessPhone,
    '{{year}}': String(new Date().getFullYear())
  };

  let output = html;
  for (const [key, value] of Object.entries(replacements)) {
    
    output = output.split(key).join(value);
  }
  return output;
}
