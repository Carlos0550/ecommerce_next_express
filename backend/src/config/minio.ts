import { Client } from 'minio';
import { Readable } from 'stream';


const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000');
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'images';


export const minioClient = new Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});


const USE_MINIO = !!(MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY);

if (USE_MINIO) {
  console.log('☁️  Usando MinIO para almacenamiento');
} else {
  console.log('📁 MinIO no configurado correctamente');
}


const getBaseUrl = (): string => {
  const protocol = MINIO_USE_SSL ? 'https' : 'http';
  
  const isStandardPort = (MINIO_USE_SSL && MINIO_PORT === 443) || (!MINIO_USE_SSL && MINIO_PORT === 80);
  return isStandardPort 
    ? `${protocol}://${MINIO_ENDPOINT}` 
    : `${protocol}://${MINIO_ENDPOINT}:${MINIO_PORT}`;
};


async function ensureBucketExists(bucketName: string): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName);
      
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`✅ Bucket "${bucketName}" creado con política pública`);
    }
  } catch (error) {
    console.error(`Error al verificar/crear bucket "${bucketName}":`, error);
  }
}


ensureBucketExists(MINIO_BUCKET);

/**
 * Sube una imagen al bucket por defecto
 */
export async function uploadImage(
  file: Buffer,
  fileName: string,
  folder: string = '',
  contentType?: string
): Promise<{ url: string | null; error: any }> {
  try {
    await ensureBucketExists(MINIO_BUCKET);
    
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const metaData = {
      'Content-Type': contentType || 'application/octet-stream',
    };

    await minioClient.putObject(MINIO_BUCKET, filePath, file, file.length, metaData);
    
    const publicUrl = `${getBaseUrl()}/${MINIO_BUCKET}/${filePath}`;
    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Error al subir imagen a MinIO:', { error, fileName, folder });
    return { url: null, error };
  }
}

/**
 * Sube un archivo a un bucket específico
 */
export async function uploadToBucket(
  file: Buffer,
  fileName: string,
  bucket: string,
  folder: string = '',
  contentType?: string
): Promise<{ path: string | null; error: any }> {
  try {
    await ensureBucketExists(bucket);
    
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const metaData = {
      'Content-Type': contentType || 'application/octet-stream',
    };

    await minioClient.putObject(bucket, filePath, file, file.length, metaData);
    
    return { path: filePath, error: null };
  } catch (error) {
    console.error('uploadToBucket_failed', { error, bucket, fileName });
    return { path: null, error };
  }
}

/**
 * Crea una URL firmada (presigned) para acceso temporal
 */
export async function createSignedUrl(
  bucket: string,
  filePath: string,
  expiresInSec: number = 3600
): Promise<{ url: string | null; error: any }> {
  try {
    const url = await minioClient.presignedGetObject(bucket, filePath, expiresInSec);
    return { url, error: null };
  } catch (error) {
    console.error('createSignedUrl_failed', { error, bucket, filePath });
    return { url: null, error };
  }
}

/**
 * Elimina una imagen del bucket por defecto
 */
export async function deleteImage(filePath: string): Promise<{ success: boolean; error: any }> {
  try {
    await minioClient.removeObject(MINIO_BUCKET, filePath);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error al eliminar imagen de MinIO:', { error, filePath });
    return { success: false, error };
  }
}

/**
 * Elimina un archivo de un bucket específico
 */
export async function deleteFromBucket(
  bucket: string,
  filePath: string
): Promise<{ success: boolean; error: any }> {
  try {
    await minioClient.removeObject(bucket, filePath);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error al eliminar archivo de MinIO:', { error, bucket, filePath });
    return { success: false, error };
  }
}

/**
 * Obtiene la URL pública de una imagen en el bucket por defecto
 */
export function getImageUrl(filePath: string): string {
  return `${getBaseUrl()}/${MINIO_BUCKET}/${filePath}`;
}

/**
 * Obtiene la URL pública de un archivo en un bucket específico
 */
export function getPublicUrlFor(bucket: string, filePath: string): string {
  return `${getBaseUrl()}/${bucket}/${filePath}`;
}

/**
 * Descarga un archivo como Buffer
 */
export async function downloadFile(
  bucket: string,
  filePath: string
): Promise<{ data: Buffer | null; error: any }> {
  try {
    const stream = await minioClient.getObject(bucket, filePath);
    const chunks: Buffer[] = [];
    
    return new Promise((resolve) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve({ data: Buffer.concat(chunks), error: null }));
      stream.on('error', (error) => resolve({ data: null, error }));
    });
  } catch (error) {
    console.error('downloadFile_failed', { error, bucket, filePath });
    return { data: null, error };
  }
}

/**
 * Lista todos los objetos en un bucket (con prefijo opcional)
 */
export async function listObjects(
  bucket: string,
  prefix: string = ''
): Promise<{ objects: string[]; error: any }> {
  try {
    const objects: string[] = [];
    const stream = minioClient.listObjects(bucket, prefix, true);
    
    return new Promise((resolve) => {
      stream.on('data', (obj) => {
        if (obj.name) objects.push(obj.name);
      });
      stream.on('end', () => resolve({ objects, error: null }));
      stream.on('error', (error) => resolve({ objects: [], error }));
    });
  } catch (error) {
    console.error('listObjects_failed', { error, bucket, prefix });
    return { objects: [], error };
  }
}

