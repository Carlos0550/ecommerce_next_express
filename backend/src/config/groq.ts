import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import { logger } from "@/utils/logger";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GROQ_API_KEY) {
  console.error(
    "❌ GROQ_API_KEY no está configurada. Las funciones de IA estarán deshabilitadas.",
  );
} else {
  console.log("🚀 Groq AI configurado correctamente");
}
if (!GEMINI_API_KEY) {
  console.warn(
    "⚠️ GEMINI_API_KEY no está configurada. Se usará Groq como fallback de visión.",
  );
} else {
  console.log("🚀 Gemini (visión) configurado correctamente");
}
const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const gemini = GEMINI_API_KEY
  ? new OpenAI({
      apiKey: GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    })
  : null;
const GROQ_VISION_FALLBACK_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const GEMINI_VISION_MODEL = "gemini-2.5-flash";
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
    const urlMatch = /\/api\/storage\/(.+)$/.exec(url);
    if (!urlMatch) {
      return null;
    }
    const filePath = urlMatch[1];
    if (!filePath) return null;
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
export interface ProductAnalysisResult {
  title: string;
  description: string;
  options: { name: string; values: string[] }[];
  suggestedCategory?: {
    name: string;
    confidence: "high" | "medium" | "low";
  };
}

interface VisionFeatures {
  productType: string;
  materials: string[];
  colors: string[];
  details: string[];
  brand: string | null;
  variants: { name: string; values: string[] }[];
}

interface ImageMessage {
  type: "image_url";
  image_url: { url: string; detail: "high" };
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
  { name: "ASPIRACIONAL", example: "Dale a tu estilo el upgrade que merece" },
  { name: "EMOCIONAL", example: "Porque vos lo vales, date ese gusto" },
  { name: "PRÁCTICO", example: "Una inversión que vale cada peso" },
  { name: "EXCLUSIVO", example: "Sé parte de quienes ya lo disfrutan" },
];

const structureFormats = [
  {
    name: "CLÁSICO",
    sections:
      "**Beneficios:**\n- (3 puntos)\n\n**Características:**\n- (3 puntos)\n\n**Modo de uso:**\n(1-2 oraciones)",
  },
  {
    name: "NARRATIVO",
    sections:
      "(Sin secciones con títulos. 3-4 párrafos fluidos describiendo el producto de forma conversacional, mezclando beneficios, características y uso.)",
  },
  {
    name: "DESTACADOS",
    sections:
      "**Lo que te encantará:**\n- (4-5 puntos mezclando beneficios y características)\n\n**Detalles:**\nPárrafo breve con especificaciones y modo de uso.",
  },
  {
    name: "PREGUNTA_RESPUESTA",
    sections:
      "**¿Por qué elegirlo?**\n(Párrafo con beneficios principales)\n\n**¿Qué incluye?**\n- (Lista de características)\n\n**¿Cómo usarlo?**\n(Instrucciones breves)",
  },
  {
    name: "MINIMALISTA",
    sections:
      "**Destacados:**\n- (4-5 puntos concisos con lo más importante)\n\nPárrafo final con detalles adicionales y cierre motivacional.",
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function safeJsonParse(raw: string): Record<string, unknown> {
  let content = raw.trim();
  content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const match = /\{[\s\S]*\}/.exec(content);
  if (match) content = match[0];
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const fixed = content.replace(/"((?:[^"\\]|\\.)*)"/g, (m) =>
      m
        .replace(/(?<!\\)\n/g, "\\n")
        .replace(/(?<!\\)\r/g, "\\r")
        .replace(/(?<!\\)\t/g, "\\t"),
    );
    return JSON.parse(fixed) as Record<string, unknown>;
  }
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

async function extractProductFeatures(
  imageMessages: ImageMessage[],
  additionalContext: string | undefined,
): Promise<VisionFeatures> {
  const contextBlock = additionalContext
    ? `\n\nContexto del usuario (puede nombrar el producto o hacer correcciones): ${additionalContext}`
    : "";

  const systemPrompt = `Analizas imágenes de productos de e-commerce y devuelves características objetivas visibles en JSON.

Schema:
{"productType": string, "materials": string[], "colors": string[], "details": string[], "brand": string | null, "variants": [{"name": string, "values": string[]}]}

REGLAS:
- productType: qué es exactamente (ej: "labial líquido mate", "pulsera de cuero trenzado").
- materials: materiales visibles.
- colors: colores presentes.
- details: 3-6 características relevantes (textura, acabado, tamaño aparente, empaque).
- brand: marca legible en la imagen o null.
- variants: solo si hay VARIACIONES REALES entre productos visibles (colores distintos, tallas). Si todos son idénticos → [].
- Si el usuario dice que algo NO existe, no lo incluyas.
- Nunca digas "cabello humano" ni "uñas humanas".`;

  const visionClient = gemini ?? groq;
  const visionModel = gemini ? GEMINI_VISION_MODEL : GROQ_VISION_FALLBACK_MODEL;
  const visionProvider = gemini ? "Gemini" : "Groq";
  console.log(`👁️ Visión: ${visionProvider} (${visionModel})`);

  const response = await visionClient.chat.completions.create({
    model: visionModel,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extrae las features del producto.${contextBlock}`,
          },
          ...imageMessages,
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content)
    throw new Error(`Sin respuesta del modelo de visión (${visionModel})`);
  const parsed = safeJsonParse(content);

  const variants = Array.isArray(parsed.variants)
    ? parsed.variants
        .filter(
          (v): v is { name: unknown; values: unknown } =>
            !!v && typeof v === "object",
        )
        .filter(
          (v) => typeof v.name === "string" && Array.isArray(v.values),
        )
        .map((v) => ({
          name: v.name as string,
          values: (v.values as unknown[]).filter(
            (x): x is string => typeof x === "string",
          ),
        }))
    : [];

  return {
    productType:
      typeof parsed.productType === "string" ? parsed.productType : "producto",
    materials: asStringArray(parsed.materials),
    colors: asStringArray(parsed.colors),
    details: asStringArray(parsed.details),
    brand:
      typeof parsed.brand === "string" && parsed.brand.trim()
        ? parsed.brand
        : null,
    variants,
  };
}

async function generateCopyFromFeatures(
  features: VisionFeatures,
  additionalContext: string | undefined,
  availableCategories: { id: string; title: string }[] | undefined,
): Promise<ProductAnalysisResult> {
  const intro = pickRandom(introStyles);
  const tone = pickRandom(toneStyles);
  const closing = pickRandom(closingStyles);
  const structure = pickRandom(structureFormats);

  console.log(
    `🎨 Estilos: Apertura=${intro.name}, Tono=${tone.name}, Cierre=${closing.name}, Estructura=${structure.name}`,
  );

  const isCorrection = additionalContext?.includes("CORRECCIONES DEL USUARIO");
  const hasCategories = !!availableCategories?.length;

  const categoryBlock =
    hasCategories && availableCategories
      ? `\n\nCATEGORÍA: elegí exactamente UNA de esta lista (nunca inventes):\n${availableCategories
          .map((c) => `- ${c.title}`)
          .join("\n")}\nconfidence: "high" si el match es claro, "medium" si es probable, "low" si es incierto.`
      : "";

  const schema = hasCategories
    ? `{"title": string, "description": string, "options": [{"name": string, "values": string[]}], "suggestedCategory": {"name": string, "confidence": "high" | "medium" | "low"}}`
    : `{"title": string, "description": string, "options": [{"name": string, "values": string[]}]}`;

  const systemPrompt = `Sos copywriter senior de e-commerce. Escribís descripciones únicas y variadas en español neutro.

ESTILO OBLIGATORIO DE ESTA DESCRIPCIÓN:
- Apertura (${intro.name}): inspirate en "${intro.example}". Solo empieces con "Presentamos" si el estilo es EXCLUSIVIDAD.
- Tono (${tone.name}): usá léxico como ${tone.keywords}.
- Cierre (${closing.name}): inspirate en "${closing.example}".
- Estructura (${structure.name}):
${structure.sections}

TITLE:
- Máximo 50 caracteres, sin emojis ni guiones.
- Incluí keywords SEO y variá el orden (producto+adjetivo / adjetivo+producto / kit de…).

DESCRIPTION:
- 600-1200 caracteres.
- Párrafo intro (2-3 oraciones) en el estilo de apertura.
- Cuerpo con la estructura asignada. Títulos de sección en **negrita** y listas con "-". Usá saltos de línea reales ("\\n") entre secciones y párrafos.
- Frase de cierre corta en el estilo asignado.
- Variá el vocabulario (premium, excepcional, superior, de primera). Nunca "alta calidad" a secas, nunca "básico/común/simple".
- Si features.brand no es null, mencionala una vez.
- Nunca digas "cabello humano" ni "uñas humanas".

OPTIONS:
- Si el contexto del usuario menciona opciones de compra (color/talla/variante) → usalas tal cual.
- Si no, usá features.variants. Si está vacío → options: [].${categoryBlock}

Respondé SOLO con JSON válido con este schema:
${schema}`;

  const contextBlock = additionalContext
    ? isCorrection
      ? `\n\nCORRECCIONES DEL USUARIO (prioridad absoluta, el usuario conoce su producto; eliminá cualquier mención a lo que niega):\n${additionalContext}`
      : `\n\nCONTEXTO DEL USUARIO:\n${additionalContext}`
    : "";

  const userPrompt = `FEATURES DEL PRODUCTO (extraídas de las imágenes):
${JSON.stringify(features, null, 2)}${contextBlock}

Generá el JSON con title, description${hasCategories ? ", options y suggestedCategory" : " y options"}.`;

  const response = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: isCorrection ? 0.3 : 0.6,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Sin respuesta del modelo de texto");
  const parsed = safeJsonParse(content);

  const title = (typeof parsed.title === "string"
    ? parsed.title
    : "Producto Generado por IA"
  ).substring(0, 50);
  const description =
    (typeof parsed.description === "string"
      ? parsed.description
      : ""
    ).substring(0, 1200) || "Descripción generada automáticamente por IA.";
  const options = Array.isArray(parsed.options)
    ? parsed.options.filter(
        (o): o is { name: string; values: string[] } =>
          !!o &&
          typeof o === "object" &&
          typeof (o as { name?: unknown }).name === "string" &&
          Array.isArray((o as { values?: unknown }).values),
      )
    : [];

  let suggestedCategory: ProductAnalysisResult["suggestedCategory"];
  const sc = parsed.suggestedCategory as
    | { name?: unknown; confidence?: unknown }
    | undefined;
  if (sc && typeof sc === "object" && typeof sc.name === "string" && sc.name.trim()) {
    const validConfidences = ["high", "medium", "low"] as const;
    const confidence = (validConfidences as readonly string[]).includes(
      sc.confidence as string,
    )
      ? (sc.confidence as "high" | "medium" | "low")
      : "low";
    suggestedCategory = {
      name: sc.name.toLowerCase().trim(),
      confidence,
    };
    console.log(
      `📂 Categoría sugerida: ${suggestedCategory.name} (confianza: ${suggestedCategory.confidence})`,
    );
  }

  return { title, description, options, suggestedCategory };
}

export const analyzeProductImages = async (
  imageUrls: string[],
  additionalContext?: string,
  availableCategories?: { id: string; title: string }[],
): Promise<ProductAnalysisResult> => {
  try {
    const imageMessagesRaw = await Promise.all(
      imageUrls.map(async (url): Promise<ImageMessage | null> => {
        if (isWhatsAppUrl(url)) {
          const base64Image = await downloadAndConvertToBase64(url);
          if (base64Image) {
            return {
              type: "image_url",
              image_url: { url: base64Image, detail: "high" },
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
              type: "image_url",
              image_url: { url: base64Image, detail: "high" },
            };
          }
          return null;
        }
        return {
          type: "image_url",
          image_url: { url, detail: "high" },
        };
      }),
    );
    const imageMessages = imageMessagesRaw.filter(
      (msg): msg is ImageMessage => msg !== null,
    );
    console.log(
      `🖼️ Imágenes válidas: ${imageMessages.length}/${imageUrls.length}`,
    );
    if (imageMessages.length === 0) {
      throw new Error(
        "No se pudieron procesar las imágenes. Por favor intenta con otras imágenes.",
      );
    }

    const features = await extractProductFeatures(
      imageMessages,
      additionalContext,
    );
    console.log(
      `🔍 Features: ${features.productType} | colores: ${features.colors.join(", ") || "—"} | variants: ${features.variants.length}`,
    );

    return await generateCopyFromFeatures(
      features,
      additionalContext,
      availableCategories,
    );
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
          content: `Sos copywriter de e-commerce. Tu tarea es CORREGIR una descripción existente según el usuario.

REGLAS:
1. El usuario indicó errores en la descripción.
2. Eliminá todo lo que el usuario diga que es incorrecto o que NO existe.
3. NO inventes características nuevas.
4. Mantené el mismo estilo, tono y longitud aproximada.

FORMATO:
- Devolvé SOLO la descripción corregida, sin explicaciones.
- Mantené el formato markdown: saltos de línea reales ("\\n"), secciones con título en **negrita** (ej: **Destacados:**, **Lo que te encantará:**, **Detalles:**, **¿Por qué elegirlo?**), listas con "-".
- No pongas todo en una sola línea.`,
        },
        {
          role: "user",
          content: `PRODUCTO: ${productTitle}
DESCRIPCIÓN ACTUAL (mantené este formato):
${currentDescription}

CORRECCIONES DEL USUARIO:
${userCorrections}

Generá la descripción corregida manteniendo el formato markdown.`,
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
  type = "e-commerce",
  description = "",
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
