import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { logger } from "@/utils/logger";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error(
    "❌ GROQ_API_KEY no está configurada. Las funciones de IA estarán deshabilitadas.",
  );
} else {
  console.log("🚀 Groq AI configurado correctamente");
}
const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL = "llama-3.3-70b-versatile";
const isDevelopment = process.env.NODE_ENV === "development";
function detectImageMimeType(buffer: Buffer): string | null {
  const signatures: { bytes: number[]; mime: string }[] = [
    { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
    { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
    { bytes: [0x47, 0x49, 0x46, 0x38], mime: "image/gif" },
    { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" },
  ];
  const firstBytes = Array.from(buffer.slice(0, 10))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
  console.log("🔢 Primeros 10 bytes (hex):", firstBytes);
  for (const sig of signatures) {
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      return sig.mime;
    }
  }
  console.warn("⚠️ No se reconoció el formato de imagen");
  return null;
}
async function downloadAndConvertToBase64(url: string): Promise<string | null> {
  try {
    console.log(
      "📥 Descargando imagen desde URL externa:",
      url.substring(0, 100) + "...",
    );
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/*",
      },
    });

    if (!response.ok) {
      throw new Error(`Error al descargar imagen: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const headers = response.headers;
    const contentType = headers.get("content-type");
    const mimeType =
      contentType || detectImageMimeType(Buffer.from(buffer)) || "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error downloading image", error);
    return null;
  }
}
function isWhatsAppUrl(url: string): boolean {
  return url.includes("whatsapp.net") || url.includes("whatsapp.com");
}
async function convertLocalUrlToBase64(url: string): Promise<string | null> {
  try {
    const urlMatch = url.match(/\/api\/storage\/(.+)$/);
    if (!urlMatch) {
      return null;
    }
    const filePath = urlMatch[1];
    const fullPath = path.join(process.cwd(), "uploads", "storage", filePath);
    const fileBuffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const mimeType = mimeTypes[ext] || "image/jpeg";
    const base64 = fileBuffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error convirtiendo URL local a base64:", error);
    return null;
  }
}
function isLocalhostUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === "localhost" ||
      urlObj.hostname === "127.0.0.1" ||
      urlObj.hostname.startsWith("192.168.") ||
      urlObj.hostname.startsWith("10.")
    );
  } catch {
    return false;
  }
}
export type ProductAnalysisResult = {
  title: string;
  description: string;
  options: { name: string; values: string[] }[];
  suggestedCategory?: {
    name: string;
    confidence: "high" | "medium" | "low";
  };
};
export const analyzeProductImages = async (
  imageUrls: string[],
  additionalContext?: string,
  availableCategories?: { id: string; title: string }[],
): Promise<ProductAnalysisResult> => {
  try {
    const imageMessagesRaw = await Promise.all(
      imageUrls.map(async (url) => {
        if (isWhatsAppUrl(url)) {
          const base64Image = await downloadAndConvertToBase64(url);
          if (base64Image) {
            return {
              type: "image_url" as const,
              image_url: {
                url: base64Image,
                detail: "high" as const,
              },
            };
          }
          console.warn(
            "❌ No se pudo descargar imagen de WhatsApp:",
            url.substring(0, 50),
          );
          return null;
        }
        if (isDevelopment && isLocalhostUrl(url)) {
          const base64Image = await convertLocalUrlToBase64(url);
          if (base64Image) {
            return {
              type: "image_url" as const,
              image_url: {
                url: base64Image,
                detail: "high" as const,
              },
            };
          }
          return null;
        }
        return {
          type: "image_url" as const,
          image_url: {
            url: url,
            detail: "high" as const,
          },
        };
      }),
    );
    const imageMessages = imageMessagesRaw.filter(
      (msg): msg is NonNullable<typeof msg> => msg !== null,
    );
    console.log(
      `🖼️ Imágenes válidas: ${imageMessages.length}/${imageUrls.length}`,
    );
    if (imageMessages.length === 0) {
      throw new Error(
        "No se pudieron procesar las imágenes. Por favor intenta con otras imágenes.",
      );
    }
    const introStyles = [
      {
        name: "PREGUNTA_RETÓRICA",
        example:
          "¿Lista para brillar? ¿Buscas el accesorio perfecto? ¿Quieres destacar?",
      },
      {
        name: "AFIRMACIÓN_DIRECTA",
        example: "Este accesorio es exactamente lo que tu look necesita",
      },
      {
        name: "STORYTELLING",
        example:
          "Imagina lucir espectacular en cada salida. Piensa en todas las miradas que atraerás",
      },
      {
        name: "BENEFICIO_PRINCIPAL",
        example: "Logra un look único con este increíble diseño",
      },
      {
        name: "EXCLUSIVIDAD",
        example: "Descubre la pieza que está conquistando corazones",
      },
    ];
    const toneStyles = [
      {
        name: "ENTUSIASTA",
        keywords: "¡increíble! ¡fantástico! ¡espectacular! ¡te va a encantar!",
      },
      {
        name: "ELEGANTE",
        keywords: "sofisticado, refinado, distinguido, exquisito, premium",
      },
      {
        name: "CERCANO",
        keywords: "vas a amar esto, es perfecto para vos, tu nuevo favorito",
      },
      {
        name: "PROFESIONAL",
        keywords: "calidad superior, acabado impecable, materiales selectos",
      },
      {
        name: "ASPIRACIONAL",
        keywords: "eleva tu estilo, transforma tu look, destaca entre todas",
      },
    ];
    const closingStyles = [
      { name: "URGENCIA", example: "¡No esperes más, hazlo tuyo!" },
      {
        name: "ASPIRACIONAL",
        example: "Dale a tu estilo el upgrade que merece",
      },
      { name: "EMOCIONAL", example: "Porque vos lo vales, date ese gusto" },
      { name: "PRÁCTICO", example: "Una inversión que vale cada peso" },
      { name: "EXCLUSIVO", example: "Sé parte de quienes ya lo disfrutan" },
    ];
    const structureFormats = [
      {
        name: "CLÁSICO",
        sections: `**✨ Beneficios:**\n- (3 puntos)\n\n**📦 Características:**\n- (3 puntos)\n\n**💡 Modo de uso:**\n(1-2 oraciones)`,
      },
      {
        name: "NARRATIVO",
        sections: `(Sin secciones con títulos. Escribe 3-4 párrafos fluidos describiendo el producto de forma conversacional. Mezcla beneficios, características y uso de forma natural.)`,
      },
      {
        name: "DESTACADOS",
        sections: `**🌟 Lo que te encantará:**\n- (4-5 puntos mezclando beneficios y características)\n\n**📝 Detalles:**\nPárrafo breve con especificaciones y modo de uso.`,
      },
      {
        name: "PREGUNTA_RESPUESTA",
        sections: `**¿Por qué elegirlo?**\n(Párrafo con beneficios principales)\n\n**¿Qué incluye?**\n- (Lista de características)\n\n**¿Cómo usarlo?**\n(Instrucciones breves)`,
      },
      {
        name: "MINIMALISTA",
        sections: `**✦ Destacados:**\n- (4-5 puntos concisos con lo más importante)\n\nPárrafo final con detalles adicionales y cierre motivacional.`,
      },
    ];
    const selectedIntro =
      introStyles[Math.floor(Math.random() * introStyles.length)];
    const selectedTone =
      toneStyles[Math.floor(Math.random() * toneStyles.length)];
    const selectedClosing =
      closingStyles[Math.floor(Math.random() * closingStyles.length)];
    const selectedStructure =
      structureFormats[Math.floor(Math.random() * structureFormats.length)];
    console.log(
      `🎨 Estilos: Apertura=${selectedIntro.name}, Tono=${selectedTone.name}, Cierre=${selectedClosing.name}, Estructura=${selectedStructure.name}`,
    );
    const categoriesSection =
      availableCategories && availableCategories.length > 0
        ? `
=== CATEGORÍAS DISPONIBLES ===
Las siguientes categorías existen en el sistema:
${availableCategories.map((c, i) => `${i + 1}. ${c.title}`).join("\n")}
IMPORTANTE sobre CATEGORÍA:
- Analiza el producto en las imágenes y determina a qué categoría pertenece
- DEBES elegir UNA de las categorías de la lista anterior
- Si el producto claramente pertenece a una categoría (ej: labial = makeup, pulsera = accesorios), indica confianza "high"
- Si tienes algo de duda pero puedes inferir, indica confianza "medium"
- Si realmente no puedes determinar la categoría, indica confianza "low"
- NUNCA inventes categorías que no estén en la lista
`
        : "";
    const systemPrompt = `Eres un experto copywriter de e-commerce. Tu trabajo es generar descripciones ÚNICAS y VARIADAS.
TAREA: Analiza las imágenes y genera un JSON con title, description, options${availableCategories ? " y suggestedCategory" : ""}.
=== ESTILO OBLIGATORIO PARA ESTA DESCRIPCIÓN ===
⚠️ CRÍTICO: DEBES seguir EXACTAMENTE estos estilos. NO uses otros estilos.
📌 APERTURA: ${selectedIntro.name}
   → INSPÍRATE EN: "${selectedIntro.example}"
   → NUNCA empieces con "Presentamos" ni "Descubre" si no es tu estilo asignado
📌 TONO: ${selectedTone.name}  
   → USA estas palabras/frases: ${selectedTone.keywords}
📌 CIERRE: ${selectedClosing.name}
   → INSPÍRATE EN: "${selectedClosing.example}"
PROHIBIDO:
❌ NO uses "Presentamos" a menos que tu estilo sea EXCLUSIVIDAD
❌ NO uses siempre las mismas estructuras de oración
❌ NO repitas vocabulario genérico como "alta calidad" sin variación
=== TITLE (título) ===
- Máximo 50 caracteres
- Profesional y atractivo
- Sin guiones ni emojis
- Incluye palabras clave SEO
- VARÍA la estructura: a veces usa "[Producto] + [Adjetivo]", otras "[Adjetivo] + [Producto]", otras "Kit/Set de [Producto]"
=== DESCRIPTION (descripción) ===
REQUISITO: La descripción DEBE tener entre 600 y 1200 caracteres.
📌 ESTRUCTURA ASIGNADA: ${selectedStructure.name}
USA ESTA ESTRUCTURA:
${selectedStructure.sections}
FORMATO DE TU DESCRIPCIÓN:
1. Párrafo introductorio (2-3 oraciones) - USA EL ESTILO DE APERTURA: ${selectedIntro.name}
2. Cuerpo con la estructura ${selectedStructure.name} indicada arriba
3. Frase final motivacional - USA EL ESTILO DE CIERRE: ${selectedClosing.name}
REGLAS:
- VARÍA el vocabulario: "premium", "excepcional", "superior", "de primera"
- NO uses checkmarks (✅) en listas, solo guiones "-"
- Si hay marca visible, menciónala
- Evita "básico", "común", "simple"
- NO menciones "cabello humano", "uñas humanas"
=== OPTIONS (opciones) ===
PRIORIDAD 1: Si el contexto adicional menciona opciones de compra explícitas, ÚSALAS DIRECTAMENTE.
PRIORIDAD 2: Si NO hay opciones en el contexto, detecta VARIACIONES REALES Y VISIBLES en las imágenes.
REGLAS:
1. Si el contexto menciona opciones → USA esas opciones exactas
2. Si NO hay contexto, solo genera si hay DIFERENCIAS claras visibles (colores, tallas, etc.)
3. NO inventes opciones basadas en cantidad de productos
4. Si todos son idénticos Y no hay contexto → devuelve []
Formato: [{"name": "Nombre", "values": ["Valor1", "Valor2"]}]
=== EJEMPLOS DE VARIEDAD EN APERTURAS ===
PREGUNTA_RETÓRICA + ENTUSIASTA:
"¿Lista para brillar en cada ocasión? ¡Este increíble set de maquillaje es tu nuevo aliado de belleza!"
AFIRMACIÓN_DIRECTA + ELEGANTE:
"Este sofisticado set de maquillaje reúne todo lo que necesitas para lograr acabados impecables y refinados."
STORYTELLING + CERCANO:
"Imagina empezar cada mañana con todo lo que necesitas a la mano. Este set va a ser tu nuevo favorito, ¡te lo aseguro!"
BENEFICIO_PRINCIPAL + PROFESIONAL:
"Consigue resultados de salón en casa con este completo set que incluye herramientas de calidad profesional."
EXCLUSIVIDAD + ASPIRACIONAL:
"Descubre la nueva colección que está transformando rutinas de belleza. Eleva tu experiencia a otro nivel."
=== FORMATO DE SALIDA ===
Responde SOLO con JSON válido, sin markdown ni explicaciones.
${availableCategories ? `{"title":"...","description":"...","options":[],"suggestedCategory":{"name":"nombre_categoria_exacto","confidence":"high|medium|low"}}` : `{"title":"...","description":"...","options":[]}`}
${categoriesSection}
⚠️ RECORDATORIO FINAL - LEE ANTES DE GENERAR:
- Descripción DEBE tener mínimo 600 caracteres
- ESTRUCTURA: ${selectedStructure.name} - sigue el formato indicado arriba
- APERTURA: ${selectedIntro.name} → "${selectedIntro.example}"
- TONO: usa palabras como ${selectedTone.keywords}
- CIERRE: ${selectedClosing.name} → "${selectedClosing.example}"
- Si tu estilo NO es EXCLUSIVIDAD, NO empieces con "Presentamos"
- VARÍA el vocabulario`;
    const response = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${
                additionalContext &&
                additionalContext.includes("CORRECCIONES DEL USUARIO")
                  ? `
🚨🚨🚨 CORRECCIÓN OBLIGATORIA - LEE ANTES DE VER LAS IMÁGENES 🚨🚨🚨
${additionalContext}
REGLAS ABSOLUTAS:
1. NO menciones NADA que el usuario haya dicho que NO tiene el producto
2. Si crees ver "estrellas de colores" pero el usuario dice que NO las tiene, NO LAS MENCIONES
3. Si crees ver algo diferente a lo que dice el usuario, CONFÍA EN EL USUARIO
4. El usuario CONOCE su producto mejor que cualquier análisis de imagen
PROHIBIDO EN ESTA DESCRIPCIÓN:
- Mencionar elementos que el usuario dijo que NO existen
- Inventar características basándote solo en la imagen
- Ignorar las correcciones del usuario
Ahora analiza las imágenes RESPETANDO las correcciones anteriores.
`
                  : ""
              }Analiza estas imágenes y genera título, descripción y opciones de compra.
        CRÍTICO sobre OPCIONES:
        ${
          additionalContext &&
          !additionalContext.includes("CORRECCIONES DEL USUARIO")
            ? `- El contexto adicional contiene información sobre opciones de compra. DEBES usar esas opciones explícitamente.
        - Si el contexto menciona opciones (ej: "Color: Rojo, Azul" o "tallas S, M, L"), conviértelas al formato JSON requerido.
        - El contexto tiene PRIORIDAD sobre la detección automática en las imágenes.
        `
            : `- Solo genera opciones si hay VARIACIONES REALES visibles entre los productos (colores diferentes, tallas, etc.)
        - NO inventes opciones basadas en la cantidad de productos
        - Si todos los productos son idénticos, devuelve options: []
        `
        }${
          additionalContext &&
          !additionalContext.includes("CORRECCIONES DEL USUARIO")
            ? `\n\nCONTEXTO ADICIONAL DEL USUARIO:
        ${additionalContext}
        IMPORTANTE: Si el contexto menciona opciones de compra, variables, variantes, colores, tallas, etc., DEBES incluirlas en el campo "options" del JSON.`
            : ""
        }${
          additionalContext &&
          additionalContext.includes("CORRECCIONES DEL USUARIO")
            ? `
🚨 RECORDATORIO FINAL: El usuario dijo que el producto ${additionalContext.replace(/.*CORRECCIONES DEL USUARIO.*\n/i, "").replace(/\n/g, " ")} - RESPETA ESTO.`
            : ""
        }`,
            },
            ...imageMessages,
          ],
        },
      ],
      temperature: additionalContext?.includes("CORRECCIONES DEL USUARIO")
        ? 0.3
        : 0.75,
      max_tokens: 2000,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No se recibió respuesta de Groq");
    }
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }
    const sanitizeInvalidEscapes = (str: string): string => {
      let fixed = str.replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u");
      fixed = fixed.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
      return fixed;
    };
    jsonContent = sanitizeInvalidEscapes(jsonContent);
    const escapeControlChars = (str: string): string => {
      let result = "";
      let inString = false;
      let escapeNext = false;
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (escapeNext) {
          result += char;
          escapeNext = false;
          continue;
        }
        if (char === "\\") {
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
          if (char === "\n") {
            result += "\\n";
          } else if (char === "\r") {
            result += "\\r";
          } else if (char === "\t") {
            result += "\\t";
          } else if (char === "\f") {
            result += "\\f";
          } else if (char === "\b") {
            result += "\\b";
          } else if (char.charCodeAt(0) < 32) {
            result += `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
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
      console.warn(
        "Error al parsear JSON, intentando escapar caracteres de control:",
        parseError,
      );
      try {
        const cleaned = escapeControlChars(jsonContent);
        parsed = JSON.parse(cleaned);
      } catch (secondError) {
        console.warn(
          "Error persistente, intentando extracción manual:",
          secondError,
        );
        const titleMatch = jsonContent.match(
          /"title"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/,
        );
        const descMatch = jsonContent.match(
          /"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/,
        );
        const optionsMatch = jsonContent.match(/"options"\s*:\s*(\[[^\]]*\])/);
        if (titleMatch || descMatch) {
          parsed = {
            title: titleMatch
              ? titleMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t")
              : "Producto Generado por IA",
            description: descMatch
              ? descMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t")
              : "Descripción generada automáticamente por IA.",
            options: optionsMatch ? JSON.parse(optionsMatch[1]) : [],
          };
        } else {
          console.error(
            "Error al parsear JSON. Contenido recibido:",
            jsonContent.substring(0, 500),
          );
          throw new Error(
            `Error al parsear respuesta de Groq: ${secondError instanceof Error ? secondError.message : String(secondError)}`,
          );
        }
      }
    }
    const title = parsed.title?.substring(0, 50) || "Producto Generado por IA";
    const description =
      parsed.description?.substring(0, 1200) ||
      "Descripción generada automáticamente por IA.";
    const options = Array.isArray(parsed.options) ? parsed.options : [];
    let suggestedCategory: ProductAnalysisResult["suggestedCategory"] =
      undefined;
    if (
      parsed.suggestedCategory &&
      typeof parsed.suggestedCategory === "object"
    ) {
      const { name, confidence } = parsed.suggestedCategory;
      if (name && typeof name === "string") {
        const validConfidences = ["high", "medium", "low"] as const;
        const normalizedConfidence = validConfidences.includes(confidence)
          ? confidence
          : "low";
        suggestedCategory = {
          name: name.toLowerCase().trim(),
          confidence: normalizedConfidence,
        };
        console.log(
          `📂 Categoría sugerida: ${suggestedCategory.name} (confianza: ${suggestedCategory.confidence})`,
        );
      }
    }
    return { title, description, options, suggestedCategory };
  } catch (error) {
    console.error("Error al analizar imágenes con Groq:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};
export const regenerateDescriptionWithCorrections = async (
  currentDescription: string,
  productTitle: string,
  userCorrections: string,
): Promise<string> => {
  try {
    console.log(
      `🔧 Regenerando descripción con correcciones (modelo de texto)`,
    );
    console.log(`📝 Correcciones: ${userCorrections}`);
    const response = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content: `Eres un experto copywriter de e-commerce. Tu tarea es CORREGIR una descripción de producto existente.
REGLAS ABSOLUTAS:
1. El usuario ha indicado que la descripción tiene ERRORES
2. DEBES eliminar todo lo que el usuario diga que es INCORRECTO
3. DEBES mantener el mismo estilo y formato de la descripción original
4. NO inventes características nuevas que no estaban en la descripción original
5. Si el usuario dice que algo NO existe, ELIMÍNALO completamente
FORMATO DE SALIDA CRÍTICO:
- Devuelve SOLO la descripción corregida, sin explicaciones
- MANTÉN EL FORMATO MARKDOWN exactamente como está en la descripción original
- USA SALTOS DE LÍNEA (\\n) para separar párrafos y secciones
- MANTÉN las secciones con sus títulos en negrita: **✦ Destacados:**, **🌟 Lo que te encantará:**, **📝 Detalles:**, **¿Por qué elegirlo?**, etc.
- MANTÉN los guiones (-) para las listas
- MANTÉN la misma estructura de párrafos y secciones
- Mantén la misma longitud aproximada
EJEMPLO DE FORMATO CORRECTO:
Párrafo introductorio aquí.
**🌟 Lo que te encantará:**
- Punto 1
- Punto 2
- Punto 3
**📝 Detalles:**
Párrafo con detalles aquí.
Frase de cierre.`,
        },
        {
          role: "user",
          content: `PRODUCTO: ${productTitle}
DESCRIPCIÓN ACTUAL (CON ERRORES) - MANTÉN ESTE FORMATO:
${currentDescription}
CORRECCIONES DEL USUARIO:
${userCorrections}
IMPORTANTE: 
1. El usuario dice que ${userCorrections}. DEBES eliminar cualquier mención a lo que el usuario dice que NO tiene el producto.
2. MANTÉN el formato markdown con saltos de línea, secciones en negrita (**), y listas con guiones (-)
3. NO pongas todo en una sola línea
Genera la descripción CORREGIDA manteniendo el formato:`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });
    const correctedDescription = response.choices[0]?.message?.content?.trim();
    if (!correctedDescription) {
      throw new Error("No se recibió respuesta del modelo");
    }
    console.log(`✅ Descripción corregida exitosamente`);
    return correctedDescription;
  } catch (error) {
    console.error("Error regenerando descripción con correcciones:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};
export { groq };
export const generatePaletteFromPrompt = async (
  prompt: string,
): Promise<{ name: string; colors: string[] }> => {
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
  if (jsonContent.startsWith("```json")) {
    jsonContent = jsonContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (jsonContent.startsWith("```")) {
    jsonContent = jsonContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  const parsed = JSON.parse(jsonContent);
  const name =
    typeof parsed.name === "string" && parsed.name.length
      ? parsed.name.slice(0, 30)
      : "generated";
  const colors = Array.isArray(parsed.colors) ? parsed.colors : [];
  if (
    colors.length !== 10 ||
    !colors.every(
      (c: any) =>
        typeof c === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c),
    )
  ) {
    throw new Error("La paleta generada no es válida");
  }
  return { name, colors };
};
export const generateBusinessDescription = async (
  name: string,
  city: string,
  province: string,
  type: string = "e-commerce",
  description: string = "",
): Promise<string> => {
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
