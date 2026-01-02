

function validateEnvVar(name: string, value: string | undefined, required: boolean = true): string {
  if (required && (!value || value.trim() === '')) {
    throw new Error(`❌ Variable de entorno requerida faltante: ${name}`);
  }
  if (value && value.trim() === '') {
    throw new Error(`❌ Variable de entorno ${name} está vacía`);
  }

  console.log(`✅ Variable de entorno ${name} validada correctamente: ${value}`);
  return value!;
}
  
export function validateEnvironmentVariables() {  
  const DATABASE_URL = validateEnvVar('DATABASE_URL', process.env.DATABASE_URL);
  const REDIS_URL = validateEnvVar('REDIS_URL', process.env.REDIS_URL, false) || 'redis://127.0.0.1:6379';
  if (!DATABASE_URL.startsWith('postgresql://') && !DATABASE_URL.startsWith('postgres://')) {
    throw new Error('❌ DATABASE_URL debe ser una URL de PostgreSQL válida');
  }
  
  if (!REDIS_URL.startsWith('redis://') && !REDIS_URL.startsWith('rediss://')) {
    throw new Error('❌ REDIS_URL debe ser una URL de Redis válida');
  }
  
  const WEBHOOK_BASE_URL = validateEnvVar('WEBHOOK_BASE_URL', process.env.WEBHOOK_BASE_URL);
  const WHATSAPP_DEV_MODE = validateEnvVar('WHATSAPP_DEV_MODE', process.env.WHATSAPP_DEV_MODE);
  const WHATSAPP_COOLDOWN_SECONDS = validateEnvVar('WHATSAPP_COOLDOWN_SECONDS', process.env.WHATSAPP_COOLDOWN_SECONDS);
  const STORE_URL = validateEnvVar('STORE_URL', process.env.STORE_URL);
  const ADMINISTRATIVE_PANEL_URL = validateEnvVar('ADMINISTRATIVE_PANEL_URL', process.env.ADMINISTRATIVE_PANEL_URL);

  const JWT_SECRET = validateEnvVar('JWT_SECRET', process.env.JWT_SECRET);
  const JWT_EXPIRES_IN = validateEnvVar('JWT_EXPIRES_IN', process.env.JWT_EXPIRES_IN);
  const RESEND_API_KEY = validateEnvVar('RESEND_API_KEY', process.env.RESEND_API_KEY);
  const RESEND_FROM = validateEnvVar('RESEND_FROM', process.env.RESEND_FROM);
  const MINIO_ENDPOINT = validateEnvVar('MINIO_ENDPOINT', process.env.MINIO_ENDPOINT);
  const MINIO_PORT = validateEnvVar('MINIO_PORT', process.env.MINIO_PORT);
  const MINIO_USE_SSL = validateEnvVar('MINIO_USE_SSL', process.env.MINIO_USE_SSL);
  const MINIO_ACCESS_KEY = validateEnvVar('MINIO_ACCESS_KEY', process.env.MINIO_ACCESS_KEY);
  const MINIO_SECRET_KEY = validateEnvVar('MINIO_SECRET_KEY', process.env.MINIO_SECRET_KEY);
  const MINIO_BUCKET = validateEnvVar('MINIO_BUCKET', process.env.MINIO_BUCKET);
  const GROQ_API_KEY = validateEnvVar('GROQ_API_KEY', process.env.GROQ_API_KEY);
  const NODE_ENV = validateEnvVar('NODE_ENV', process.env.NODE_ENV);
  return {
    DATABASE_URL,
    REDIS_URL,
    WEBHOOK_BASE_URL,
    WHATSAPP_DEV_MODE,
    WHATSAPP_COOLDOWN_SECONDS,
    STORE_URL,
    ADMINISTRATIVE_PANEL_URL,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    RESEND_API_KEY,
    RESEND_FROM,
    MINIO_ENDPOINT,
    MINIO_PORT,
    MINIO_USE_SSL,
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
    MINIO_BUCKET,
    GROQ_API_KEY,
    NODE_ENV,
  }
}

