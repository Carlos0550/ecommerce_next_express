/**
 * Detector de tono de mensajes
 * Identifica saludos, tono argentino/formal y estilo de comunicación
 */

// ============================================================================
// TIPOS
// ============================================================================

export type UserTone = 'argentino' | 'formal' | 'neutral';
export type GreetingTone = 'casual' | 'formal';

// ============================================================================
// CONSTANTES - PATRONES DE DETECCIÓN
// ============================================================================

const GREETING_PATTERNS = [
  'hola', 'holi', 'holis', 'hola!', 'hola?',
  'buenos días', 'buen día', 'buenos dias', 'buen dia',
  'buenas tardes', 'buenas noches',
  'hi', 'hello', 'hey', 'que tal', 'qué tal',
  'buenas', 'saludos', 'buen día', 'buendia'
];

const CASUAL_GREETINGS = [
  'holii', 'holi', 'holis', 'holaa', 'holaaa', 'hola!', 'hola?',
  'hey', 'que tal', 'qué tal', 'buenas', 'buendia', 'buen dia'
];

const FORMAL_GREETINGS = [
  'buenos días', 'buen día', 'buenas tardes', 'buenas noches',
  'saludos', 'buenos dias'
];

const ARGENTINO_MARKERS = [
  'che', 'dale', 'de una', 'deuna', 'posta', 'posta que',
  'flaco', 'flaca', 'capo', 'capaz',
  're ', 're-', 'rebueno', 'remal', 're lindo', 're feo',
  'tremendo', 'tremenda', 'tremendo/a', 'tremendísimo',
  'joya', 'joyita', 'genial', 'grosso', 'grossa',
  'buenísimo', 'malísimo', 'buenísima', 'malísima',
  'copado', 'copada', 'copadísimo', 'copadísima',
  'chabón', 'chabona', 'pibe', 'piba', 'mina',
  'laburo', 'laburar', 'laburando', 'laburé',
  'mira vos', 'mirá vos', 'mira que', 'mirá que',
  'qué sé yo', 'que se yo', 'ni idea', 'ni ahí',
  'de última', 'de ultima', 'por ahí', 'por ahi',
  'posta', 'postea', 'posta que sí', 'posta que no'
];

const FORMAL_MARKERS = [
  'usted', 'por favor', 'porfavor', 'gracias', 'muchas gracias',
  'disculpe', 'disculpa', 'perdón', 'perdon', 'permiso',
  'le agradezco', 'le solicito', 'le pido', 'le ruego',
  'sería tan amable', 'podría', 'quisiera', 'desearía'
];

const FORMAL_REQUEST_PATTERNS = [
  'habla formal', 'hablá formal', 'habla formalmente', 'hablá formalmente',
  'sé más profesional', 'se más profesional', 'se profesional',
  'deja de hablar así', 'dejá de hablar así', 'deja de hablar',
  'habla serio', 'hablá serio', 'habla en serio', 'hablá en serio',
  'habla profesional', 'hablá profesional', 'habla profesionalmente',
  'sin emojis', 'sin emoji', 'no uses emojis', 'no uses emoji'
];

// ============================================================================
// FUNCIONES DE DETECCIÓN
// ============================================================================

/**
 * Detecta si un mensaje es un saludo
 */
export function isGreeting(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  
  // Verificar coincidencia con patrones de saludo
  const matchesGreeting = GREETING_PATTERNS.some(greeting => {
    const msgWords = normalized.split(/\s+/);
    const greetingWords = greeting.split(/\s+/);
    return greetingWords.every(word => 
      msgWords.some(mw => mw.startsWith(word) || word.startsWith(mw))
    );
  });
  
  // También considerar mensajes cortos que contengan saludos
  const isShortGreeting = normalized.length <= 10 && 
    GREETING_PATTERNS.some(g => normalized.includes(g));
  
  return matchesGreeting || isShortGreeting;
}

/**
 * Detecta el tono del saludo (casual o formal)
 */
export function detectGreetingTone(message: string): GreetingTone {
  const normalized = message.toLowerCase().trim();
  
  if (CASUAL_GREETINGS.some(g => normalized.includes(g))) {
    return 'casual';
  }
  
  if (FORMAL_GREETINGS.some(g => normalized.includes(g))) {
    return 'formal';
  }
  
  return 'casual';
}

/**
 * Detecta el tono general del usuario en el mensaje
 */
export function detectUserTone(message: string): UserTone {
  const normalized = message.toLowerCase();
  
  // Contar marcadores argentinos
  const argentinoCount = ARGENTINO_MARKERS.filter(marker => 
    normalized.includes(marker) || 
    normalized.split(/\s+/).some(word => word.includes(marker))
  ).length;
  
  // Contar marcadores formales
  const formalCount = FORMAL_MARKERS.filter(marker => 
    normalized.includes(marker)
  ).length;
  
  // Determinar tono basado en conteo
  if (argentinoCount >= 2) {
    return 'argentino';
  }
  
  if (formalCount >= 2) {
    return 'formal';
  }
  
  return 'neutral';
}

/**
 * Detecta si el usuario está pidiendo explícitamente un tono formal
 */
export function isRequestingFormalTone(message: string): boolean {
  const normalized = message.toLowerCase();
  return FORMAL_REQUEST_PATTERNS.some(pattern => normalized.includes(pattern));
}

/**
 * Obtiene los emojis apropiados según el tipo de negocio
 */
export function getBusinessEmojis(
  businessType?: string | null, 
  businessDescription?: string | null
): string {
  if (!businessType && !businessDescription) {
    return '📦';
  }
  
  const text = (businessType || businessDescription || '').toLowerCase();
  
  const emojiMap: Record<string, string> = {
    'makeup|maquillaje|cosmetic|cosmético': '🎀🌸💄',
    'joyer|joya|anillo|collar': '💍✨💎',
    'marroquin|cuero|cartera|bolso': '👜👝💼',
    'mate|yerba': '🧉🍃',
    'ropa|indumentaria|vestimenta': '👗👔👕',
    'zapato|calzado': '👠👟👢',
    'decor|hogar|casa': '🏠🕯️🖼️',
    'tecnolog|electron|celular': '📱💻⌚',
    'libro|papeler': '📚📖✏️',
    'deporte|fitness|gimnasio': '⚽🏋️‍♀️🎾',
    'comida|restaurant|café|cafe': '🍕🍔☕',
  };
  
  for (const [patterns, emojis] of Object.entries(emojiMap)) {
    const patternList = patterns.split('|');
    if (patternList.some(p => text.includes(p))) {
      return emojis;
    }
  }
  
  return '📦✨';
}

