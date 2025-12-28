import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/utils/logger';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY no está configurada. Las funciones de IA estarán deshabilitadas.');
}else{
  console.log('🚀 Groq AI configurado correctamente');
}

const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});


const VISION_MODEL = 'meta-llama/llama-4-maverick-17b-128e-instruct';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

const isDevelopment = process.env.NODE_ENV === 'development';

async function convertLocalUrlToBase64(url: string): Promise<string | null> {
  try {
    const urlMatch = url.match(/\/api\/storage\/(.+)$/);
    if (!urlMatch) {
      return null;
    }

    const filePath = urlMatch[1];
    const fullPath = path.join(process.cwd(), 'uploads', 'storage', filePath);

    const fileBuffer = await fs.readFile(fullPath);

    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';

    const base64 = fileBuffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error convirtiendo URL local a base64:', error);
    return null;
  }
}

function isLocalhostUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1' || urlObj.hostname.startsWith('192.168.') || urlObj.hostname.startsWith('10.');
  } catch {
    return false;
  }
}

export const analyzeProductImages = async (imageUrls: string[], additionalContext?: string): Promise<{ title: string; description: string; options: { name: string; values: string[] }[] }> => {
  try {
    const imageMessages = await Promise.all(
      imageUrls.map(async (url) => {
        if (isDevelopment && isLocalhostUrl(url)) {
          const base64Image = await convertLocalUrlToBase64(url);
          if (base64Image) {
            return {
              type: "image_url" as const,
              image_url: {
                url: base64Image,
                detail: "high" as const
              }
            };
          }
        }

        return {
          type: "image_url" as const,
          image_url: {
            url: url,
            detail: "high" as const
          }
        };
      })
    );

    const systemPrompt = `Eres un experto copywriter de e-commerce. Genera contenido de venta para productos.

TAREA: Analiza las imágenes y genera un JSON con title, description y options.

=== TITLE (título) ===
- Máximo 50 caracteres
- Profesional y atractivo
- Sin guiones ni emojis
- Incluye palabras clave SEO

=== DESCRIPTION (descripción) ===
REQUISITO CRÍTICO: La descripción DEBE tener entre 600 y 1200 caracteres. Esto es OBLIGATORIO.

FORMATO OBLIGATORIO: La descripción debe usar EXACTAMENTE este formato con secciones marcadas:

1. Párrafo introductorio (2-3 oraciones describiendo el producto)

**✨ Beneficios:**
- Beneficio 1
- Beneficio 2
- Beneficio 3

**📦 Características:**
- Característica 1 (materiales, calidad, etc.)
- Característica 2

**💡 Modo de uso:**
Instrucciones claras de cómo usar el producto (1-2 oraciones).

Frase final motivacional para la compra.

REGLAS DE FORMATO:
- USA los subtítulos exactos: "**✨ Beneficios:**", "**📦 Características:**", "**💡 Modo de uso:**"
- Los guiones "-" son para listas de items
- Usa emojis solo en los subtítulos
- Si hay marca visible en la imagen, menciónala en la introducción
- Evita palabras como "básico", "común", "simple"
- NO menciones "cabello humano", "uñas humanas" aunque aparezca en etiquetas

=== OPTIONS (opciones) ===
PRIORIDAD 1: Si el contexto adicional menciona opciones de compra explícitas, ÚSALAS DIRECTAMENTE.

PRIORIDAD 2: Si NO hay opciones en el contexto, detecta VARIACIONES REALES Y VISIBLES en las imágenes.

REGLAS ESTRICTAS:
1. Si el contexto dice "opciones: Color: Rojo, Azul" → USA esas opciones exactas
2. Si el contexto menciona variantes → Conviértelas al formato: [{"name": "Color", "values": ["Rojo", "Azul"]}]
3. Si NO hay contexto sobre opciones, solo genera si hay DIFERENCIAS claras visibles:
   - Colores diferentes (ej: Rojo, Azul, Negro)
   - Tallas diferentes (ej: S, M, L, XL)
   - Materiales diferentes (ej: Algodón, Poliéster)
   - Estilos diferentes (ej: Clásico, Moderno)
4. NO inventes opciones basadas en la cantidad de productos (ej: "Delineador 1", "Delineador 2")
5. Si todos los productos son idénticos Y no hay contexto sobre opciones → devuelve []

EJEMPLOS CORRECTOS:
- Contexto: "opciones: Color: Rojo, Azul, Negro" → [{"name": "Color", "values": ["Rojo", "Azul", "Negro"]}]
- Contexto: "tallas S, M, L" → [{"name": "Talla", "values": ["S", "M", "L"]}]
- Sin contexto, 6 delineadores todos negros → [] (sin opciones)
- Sin contexto, 3 delineadores: rojo, azul, negro → [{"name": "Color", "values": ["Rojo", "Azul", "Negro"]}]

Formato: [{"name": "Nombre de la variante", "values": ["Valor1", "Valor2"]}]
Si no hay variantes ni contexto, devuelve: []

=== EJEMPLO DE DESCRIPCIÓN CORRECTA ===
"Descubre este increíble set de maquillaje profesional de la marca XYZ que transformará tu rutina de belleza. Incluye todo lo que necesitas para lograr looks impactantes.

**✨ Beneficios:**
- Pigmentos de alta duración que se mantienen todo el día
- Fórmula suave que cuida tu piel
- Colores versátiles para cualquier ocasión

**📦 Características:**
- Texturas sedosas y cremosas
- Acabado profesional y uniforme
- Incluye 12 tonos diferentes

**💡 Modo de uso:**
Aplica con brocha o esponja para mejores resultados. Ideal para uso diario o eventos especiales.

¡Eleva tu rutina de maquillaje con este set profesional!"

=== FORMATO DE SALIDA ===
Responde SOLO con JSON válido, sin markdown ni explicaciones.

IMPORTANTE: 
- Todas las strings JSON deben tener caracteres especiales escapados (\\n para saltos de línea, \\t para tabs)
- NO uses saltos de línea reales dentro de las strings JSON
- El JSON debe ser una sola línea o usar \\n dentro de las strings

Formato:
{"title":"...","description":"...","options":[]}

RECUERDA: La descripción DEBE tener mínimo 600 caracteres y usar el formato con subtítulos.`;

    const response = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analiza estas imágenes y genera título, descripción y opciones de compra.

        CRÍTICO sobre OPCIONES:
        ${additionalContext ? `- El contexto adicional contiene información sobre opciones de compra. DEBES usar esas opciones explícitamente.
        - Si el contexto menciona opciones (ej: "Color: Rojo, Azul" o "tallas S, M, L"), conviértelas al formato JSON requerido.
        - El contexto tiene PRIORIDAD sobre la detección automática en las imágenes.
        ` : `- Solo genera opciones si hay VARIACIONES REALES visibles entre los productos (colores diferentes, tallas, etc.)
        - NO inventes opciones basadas en la cantidad de productos
        - Si todos los productos son idénticos, devuelve options: []
        `}${additionalContext ? `\n\nCONTEXTO ADICIONAL DEL USUARIO (LEE CUIDADOSAMENTE Y USA LAS OPCIONES SI SE MENCIONAN):
        ${additionalContext}

        IMPORTANTE: Si el contexto menciona opciones de compra, variables, variantes, colores, tallas, etc., DEBES incluirlas en el campo "options" del JSON.` : ''}`
            },
            ...imageMessages
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se recibió respuesta de Groq');
    }

    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    const escapeControlChars = (str: string): string => {
      let result = '';
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (escapeNext) {
          result += char;
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          result += char;
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          result += char;
          continue;
        }

        if (inString) {
          if (char === '\n') {
            result += '\\n';
          } else if (char === '\r') {
            result += '\\r';
          } else if (char === '\t') {
            result += '\\t';
          } else if (char === '\f') {
            result += '\\f';
          } else if (char === '\b') {
            result += '\\b';
          } else if (char.charCodeAt(0) < 32) {
            result += `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
          } else {
            result += char;
          }
        } else {
          result += char;
        }
      }

      return result;
    };

    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.warn('Error al parsear JSON, intentando escapar caracteres de control:', parseError);

      try {
        const cleaned = escapeControlChars(jsonContent);
        parsed = JSON.parse(cleaned);
      } catch (secondError) {
        console.warn('Error persistente, intentando extracción manual:', secondError);

        const titleMatch = jsonContent.match(/"title"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const descMatch = jsonContent.match(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const optionsMatch = jsonContent.match(/"options"\s*:\s*(\[[^\]]*\])/);

        if (titleMatch || descMatch) {
          parsed = {
            title: titleMatch ? titleMatch[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t') : 'Producto Generado por IA',
            description: descMatch ? descMatch[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t') : 'Descripción generada automáticamente por IA.',
            options: optionsMatch ? JSON.parse(optionsMatch[1]) : []
          };
        } else {
          console.error('Error al parsear JSON. Contenido recibido:', jsonContent.substring(0, 500));
          throw new Error(`Error al parsear respuesta de Groq: ${secondError instanceof Error ? secondError.message : String(secondError)}`);
        }
      }
    }

    const title = parsed.title?.substring(0, 50) || 'Producto Generado por IA';
    const description = parsed.description?.substring(0, 1200) || 'Descripción generada automáticamente por IA.';
    const options = Array.isArray(parsed.options) ? parsed.options : [];

    return { title, description, options };
  } catch (error) {
    console.error('Error al analizar imágenes con Groq:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

export { groq };

export const generatePaletteFromPrompt = async (prompt: string): Promise<{ name: string; colors: string[] }> => {
  const systemPrompt = `
Eres un diseñador experto en color y sistemas de diseño UI.

Tu tarea es generar una paleta de 10 colores HEX (shades 0 a 9) compatible con Mantine, basada en la descripción del usuario.

REGLAS FUNDAMENTALES:
- Detecta la familia cromática principal solicitada por el usuario.
- Todos los colores de la paleta deben pertenecer claramente a esa familia cromática.
- Mantén el mismo matiz base a lo largo de toda la paleta.
- La variación entre shades debe lograrse principalmente ajustando lightness y saturación, no el hue.
- No reinterpretar ni "desplazar" el color hacia otra familia por razones estéticas.

PROGRESIÓN DE SHADES:
- colors[0] debe ser el tono más claro.
- colors[9] debe ser el tono más oscuro.
- La transición debe ser gradual, coherente y usable en UI.

CALIDAD UI:
- La paleta debe ser armónica, legible y adecuada para interfaces modernas.
- Evita extremos inutilizables (demasiado grisáceo, demasiado saturado o sin contraste funcional).

FORMATO DE SALIDA:
- Responder SOLO JSON válido.
- Claves exactas: name (string corto) y colors (array de 10 strings HEX).
- El array colors debe contener exactamente 10 valores HEX.
- No incluir texto adicional, comentarios ni markdown.

Formato EXACTO:
{"name":"...","colors":["#......","#......","#......","#......","#......","#......","#......","#......","#......","#......"]}
`;

  const response = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Genera una paleta según: ${prompt}` },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("No se recibió respuesta de Groq");

  let jsonContent = content;
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(jsonContent);
  const name = typeof parsed.name === 'string' && parsed.name.length ? parsed.name.slice(0, 30) : 'generated';
  const colors = Array.isArray(parsed.colors) ? parsed.colors : [];

  if (colors.length !== 10 || !colors.every((c: any) => typeof c === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c))) {
    throw new Error('La paleta generada no es válida');
  }

  return { name, colors };
};

export const generateBusinessDescription = async (name: string, city: string, province: string, type: string = "e-commerce", description: string = ""): Promise<string> => {
  const systemPrompt = `
    Eres un especialista senior en SEO local y redacción comercial para negocios digitales.

    Tu tarea es generar una descripción profesional, clara y optimizada para SEO.

    Reglas estrictas:
    - La descripción DEBE tener entre 150 y 200 caracteres (ni más ni menos).
    - Debe incluir el nombre del negocio de forma natural.
    - Si se proporciona una ubicación válida, debe mencionarse una sola vez, y siempre incluye la provincia, ciudad y el país.
    - Debe describir claramente qué ofrece el negocio y su propuesta de valor.
    - Usa palabras clave relevantes para el tipo de negocio, integradas de forma natural (sin listas).
    - Prioriza SEO local y términos transaccionales cuando aplique.
    - Tono amigable pero profesional y confiable, sin ser muy formal.
    - No uses emojis.
    - No repitas frases genéricas ni relleno comercial vacío.

    Devuelve SOLO el texto final, sin comillas, títulos ni etiquetas.
    `;

  const userPrompt = `
    Nombre del negocio: ${name}
    Ubicación: ${city}, ${province}, Argentina
    Tipo de negocio: ${type || "No especificado"}
    Descripción actual: ${description || "No especificada"}

    Genera la descripción cumpliendo estrictamente las reglas indicadas.
    `;

  const response = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  logger.info("generateBusinessDescription_response", JSON.stringify(response));
  const content = response.choices[0]?.message?.content?.trim();
  
  if (!content) {
    logger.error("generateBusinessDescription_error", JSON.stringify(response));
    throw new Error("No se recibió respuesta de Groq");
  }

  logger.info("generateBusinessDescription_response", content);

  return content;
};

