/**
 * Script de Migración de Storage
 * 
 * Este script migra todos los archivos de Supabase Storage a MinIO
 * y actualiza las URLs en la base de datos destino.
 * 
 * IMPORTANTE: Ejecutar DESPUÉS de migrate-database.ts
 * 
 * Uso: npx ts-node-dev --transpile-only -r tsconfig-paths/register scripts/migrate-storage.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client as MinioClient } from 'minio';
import { Pool } from 'pg';







const SUPABASE_URL = '';  
const SUPABASE_KEY = 'TU_SERVICE_ROLE_KEY_AQUI';  
const SUPABASE_BUCKET = 'images'; 


const MINIO_CONFIG = {
  endPoint: '',  
  port: 443,
  useSSL: true,  
  accessKey: '',
  secretKey: '',
};
const MINIO_BUCKET = 'images'; 


const DEST_DB = {
  host: '',
  port: 10187,
  database: 'railway',
  user: 'postgres',
  password: '',
  ssl: { rejectUnauthorized: false }
};





interface ImageField {
  table: string;
  idColumn: string;
  imageColumn: string;
  isJsonArray?: boolean;  
  folder: string;         
}

const IMAGE_FIELDS: ImageField[] = [
  
  {
    table: 'Products',
    idColumn: 'id',
    imageColumn: 'images',
    isJsonArray: true,
    folder: 'products'
  },
  
  {
    table: 'Categories',
    idColumn: 'id',
    imageColumn: 'image',
    isJsonArray: false,
    folder: 'categories'
  },
  
  {
    table: 'User',
    idColumn: 'id',
    imageColumn: 'profile_image',
    isJsonArray: false,
    folder: 'avatars'
  },
  
  {
    table: 'Admin',
    idColumn: 'id',
    imageColumn: 'profile_image',
    isJsonArray: false,
    folder: 'avatars'
  },
  
  {
    table: 'BusinessData',
    idColumn: 'id',
    imageColumn: 'business_image',
    isJsonArray: false,
    folder: 'business/images'
  },
  {
    table: 'BusinessData',
    idColumn: 'id',
    imageColumn: 'favicon',
    isJsonArray: false,
    folder: 'business/images'
  },
  
  {
    table: 'Promos',
    idColumn: 'id',
    imageColumn: 'image',
    isJsonArray: false,
    folder: 'promos'
  },
];





/**
 * Extrae el path del archivo de una URL de Supabase
 */
function extractPathFromSupabaseUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  try {
    const urlObj = new URL(url);
    
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)/);
    if (match) {
      return match[2]; 
    }
    
    
    const parts = urlObj.pathname.split('/');
    const bucketIndex = parts.findIndex(p => p === SUPABASE_BUCKET);
    if (bucketIndex >= 0) {
      return parts.slice(bucketIndex + 1).join('/');
    }
    
    return null;
  } catch {
    
    return url.startsWith('/') ? url.slice(1) : url;
  }
}

/**
 * Genera la nueva URL de MinIO
 */
function generateMinioUrl(filePath: string, bucket: string = MINIO_BUCKET): string {
  const protocol = MINIO_CONFIG.useSSL ? 'https' : 'http';
  return `${protocol}://${MINIO_CONFIG.endPoint}:${MINIO_CONFIG.port}/${bucket}/${filePath}`;
}

/**
 * Descarga un archivo de Supabase Storage
 */
async function downloadFromSupabase(
  supabase: SupabaseClient,
  bucket: string,
  filePath: string
): Promise<Buffer | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(filePath);
    
    if (error) {
      console.error(`  ❌ Error descargando ${filePath}:`, error.message || JSON.stringify(error));
      return null;
    }
    
    if (!data) {
      console.error(`  ❌ No se recibieron datos para ${filePath}`);
      return null;
    }
    
    
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    console.error(`  ❌ Excepción descargando ${filePath}:`, error.message || error);
    return null;
  }
}

/**
 * Sube un archivo a MinIO
 */
async function uploadToMinio(
  minio: MinioClient,
  bucket: string,
  filePath: string,
  data: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<boolean> {
  try {
    
    const exists = await minio.bucketExists(bucket);
    if (!exists) {
      await minio.makeBucket(bucket);
      
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };
      await minio.setBucketPolicy(bucket, JSON.stringify(policy));
    }
    
    await minio.putObject(bucket, filePath, data, data.length, {
      'Content-Type': contentType
    });
    
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error subiendo a MinIO ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Detecta el content-type basado en la extensión
 */
function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'pdf': 'application/pdf',
  };
  return types[ext || ''] || 'application/octet-stream';
}


const CONCURRENCY_LIMIT = 5;

/**
 * Procesa promesas en lotes con límite de concurrencia
 */
async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = CONCURRENCY_LIMIT
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    console.log(`  ⏳ Progreso: ${Math.min(i + batchSize, items.length)}/${items.length}`);
  }
  return results;
}

/**
 * Migra un archivo individual
 */
async function migrateFile(
  supabase: SupabaseClient,
  minio: MinioClient,
  supabaseBucket: string,
  sourcePath: string,
  destBucket: string = MINIO_BUCKET
): Promise<{ success: boolean; newUrl: string | null }> {
  
  const data = await downloadFromSupabase(supabase, supabaseBucket, sourcePath);
  if (!data) {
    return { success: false, newUrl: null };
  }
  
  
  const contentType = getContentType(sourcePath);
  const uploaded = await uploadToMinio(minio, destBucket, sourcePath, data, contentType);
  
  if (!uploaded) {
    return { success: false, newUrl: null };
  }
  
  const newUrl = generateMinioUrl(sourcePath, destBucket);
  return { success: true, newUrl };
}

/**
 * Procesa los registros de una tabla y migra sus imágenes (VERSIÓN PARALELA)
 */
async function processTableImages(
  pool: Pool,
  supabase: SupabaseClient,
  minio: MinioClient,
  field: ImageField
): Promise<{ migrated: number; failed: number; updated: number }> {
  console.log(`\n📦 Procesando: ${field.table}.${field.imageColumn}`);
  
  const stats = { migrated: 0, failed: 0, updated: 0 };
  
  try {
    
    const query = `SELECT "${field.idColumn}", "${field.imageColumn}" FROM "${field.table}" WHERE "${field.imageColumn}" IS NOT NULL`;
    const result = await pool.query(query);
    
    console.log(`  📊 Registros con imágenes: ${result.rows.length}`);
    
    
    const urlsToMigrate: Map<string, string> = new Map(); 
    const recordsData: Array<{ id: any; urls: string[]; isArray: boolean }> = [];
    
    for (const row of result.rows) {
      const recordId = row[field.idColumn];
      let imageData = row[field.imageColumn];
      if (!imageData) continue;
      
      if (field.isJsonArray) {
        const urls: string[] = Array.isArray(imageData) 
          ? imageData 
          : (typeof imageData === 'string' ? JSON.parse(imageData) : []);
        
        recordsData.push({ id: recordId, urls, isArray: true });
        
        for (const url of urls) {
          if (!url || typeof url !== 'string' || url.includes(MINIO_CONFIG.endPoint)) continue;
          const sourcePath = extractPathFromSupabaseUrl(url);
          if (sourcePath) urlsToMigrate.set(sourcePath, url);
        }
      } else {
        const url = imageData as string;
        recordsData.push({ id: recordId, urls: [url], isArray: false });
        
        if (!url.includes(MINIO_CONFIG.endPoint)) {
          const sourcePath = extractPathFromSupabaseUrl(url);
          if (sourcePath) urlsToMigrate.set(sourcePath, url);
        }
      }
    }
    
    console.log(`  📊 URLs únicas a migrar: ${urlsToMigrate.size}`);
    
    
    const migratedUrls: Map<string, string> = new Map(); 
    const pathsArray = Array.from(urlsToMigrate.entries());
    
    for (let i = 0; i < pathsArray.length; i += CONCURRENCY_LIMIT) {
      const batch = pathsArray.slice(i, i + CONCURRENCY_LIMIT);
      
      const results = await Promise.all(
        batch.map(async ([sourcePath, originalUrl]) => {
          const result = await migrateFile(supabase, minio, SUPABASE_BUCKET, sourcePath);
          return { sourcePath, originalUrl, ...result };
        })
      );
      
      for (const r of results) {
        if (r.success && r.newUrl) {
          migratedUrls.set(r.originalUrl, r.newUrl);
          stats.migrated++;
        } else {
          stats.failed++;
        }
      }
      
      console.log(`  ⏳ Progreso: ${Math.min(i + CONCURRENCY_LIMIT, pathsArray.length)}/${pathsArray.length} archivos`);
    }
    
    
    console.log(`  💾 Actualizando registros en base de datos...`);
    
    for (const record of recordsData) {
      const newUrls = record.urls.map(url => migratedUrls.get(url) || url);
      const hasChanges = record.urls.some((url, i) => url !== newUrls[i]);
      
      if (hasChanges) {
        if (record.isArray) {
          await pool.query(
            `UPDATE "${field.table}" SET "${field.imageColumn}" = $1 WHERE "${field.idColumn}" = $2`,
            [JSON.stringify(newUrls), record.id]
          );
        } else {
          await pool.query(
            `UPDATE "${field.table}" SET "${field.imageColumn}" = $1 WHERE "${field.idColumn}" = $2`,
            [newUrls[0], record.id]
          );
        }
        stats.updated++;
      }
    }
    
    console.log(`  ✅ Resultados: ${stats.migrated} migrados, ${stats.failed} fallidos, ${stats.updated} actualizados`);
    
  } catch (error: any) {
    console.error(`  ❌ Error procesando ${field.table}.${field.imageColumn}:`, error.message);
  }
  
  return stats;
}





async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 MIGRACIÓN DE STORAGE: Supabase -> MinIO');
  console.log('═'.repeat(60));
  console.log(`\n📍 Origen: ${SUPABASE_URL} (bucket: ${SUPABASE_BUCKET})`);
  console.log(`📍 Destino: ${MINIO_CONFIG.endPoint}:${MINIO_CONFIG.port} (bucket: ${MINIO_BUCKET})`);
  console.log(`📍 Base de datos: ${DEST_DB.host}:${DEST_DB.port}/${DEST_DB.database}`);
  
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const minio = new MinioClient(MINIO_CONFIG);
  
  const pool = new Pool({
    ...DEST_DB,
    ssl: DEST_DB.ssl ? { rejectUnauthorized: false } : false
  });
  
  
  const globalStats = {
    totalMigrated: 0,
    totalFailed: 0,
    totalUpdated: 0,
  };
  
  try {
    
    console.log('\n🔌 Probando conexiones...');
    
    
    await minio.listBuckets();
    console.log('  ✓ Conexión a MinIO exitosa');
    
    
    await pool.query('SELECT 1');
    console.log('  ✓ Conexión a base de datos exitosa');
    
    
    console.log('\n' + '─'.repeat(60));
    console.log('📋 MIGRANDO ARCHIVOS');
    console.log('─'.repeat(60));
    
    for (const field of IMAGE_FIELDS) {
      const stats = await processTableImages(pool, supabase, minio, field);
      globalStats.totalMigrated += stats.migrated;
      globalStats.totalFailed += stats.failed;
      globalStats.totalUpdated += stats.updated;
    }
    
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('═'.repeat(60));
    console.log(`  ✅ Archivos migrados: ${globalStats.totalMigrated}`);
    console.log(`  ❌ Archivos fallidos: ${globalStats.totalFailed}`);
    console.log(`  📝 Registros actualizados: ${globalStats.totalUpdated}`);
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error fatal durante la migración:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Conexiones cerradas');
  }
}


main().catch(console.error);

