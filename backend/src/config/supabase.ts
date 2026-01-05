import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';


const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'images';
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);

const getBaseUrl = (): string => {
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || 'localhost';
  return `http://${host}:${port}`;
};

const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploads', 'storage');

async function ensureLocalStorageDir(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creando directorio de almacenamiento local:', error);
  }
}

ensureLocalStorageDir();

export const supabase = USE_SUPABASE
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!)
  : null;

if (!USE_SUPABASE) {
  console.log('📁 Usando almacenamiento local (Supabase no configurado)');
} else {
  console.log('☁️  Usando Supabase para almacenamiento');
}

export async function uploadImage(
  file: Buffer,
  fileName: string,
  folder: string = '',
  contentType?: string
): Promise<{ url: string | null; error: any }> {
  if (USE_SUPABASE && supabase) {
    try {
      const filePath = folder ? `${folder}/${fileName}` : fileName;
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, file, {
          upsert: true,
          contentType: contentType || 'application/octet-stream'
        });
      
      if (error) {
        console.error('Error al subir imagen a Supabase:', { error, fileName, folder });
        return { url: null, error };
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(filePath);
      
      return { url: publicUrl, error: null };
    } catch (error) {
      console.error('Excepción al subir imagen a Supabase:', { error, fileName, folder });
      return { url: null, error };
    }
  }

  try {
    await ensureLocalStorageDir();
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const fullPath = path.join(LOCAL_STORAGE_DIR, SUPABASE_BUCKET, filePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file);
    
    const url = `${getBaseUrl()}/api/storage/${SUPABASE_BUCKET}/${filePath}`;
    return { url, error: null };
  } catch (error) {
    console.error('Error al subir imagen localmente:', { error, fileName, folder });
    return { url: null, error };
  }
}

export async function uploadToBucket(
  file: Buffer,
  fileName: string,
  bucket: string,
  folder: string = '',
  contentType?: string
): Promise<{ path: string | null; error: any }> {
  if (USE_SUPABASE && supabase) {
    try {
      const filePath = folder ? `${folder}/${fileName}` : fileName;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true, contentType: contentType || 'application/octet-stream' });
      if (error) {
        console.error('uploadToBucket_failed', { error, bucket, filePath });
        return { path: null, error };
      }
      return { path: filePath, error: null };
    } catch (error) {
      console.error('uploadToBucket_exception', { error, bucket, fileName });
      return { path: null, error };
    }
  }

  try {
    await ensureLocalStorageDir();
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const fullPath = path.join(LOCAL_STORAGE_DIR, bucket, filePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file);
    
    return { path: filePath, error: null };
  } catch (error) {
    console.error('uploadToBucket_exception (local)', { error, bucket, fileName });
    return { path: null, error };
  }
}

export async function createSignedUrl(bucket: string, filePath: string, expiresInSec: number = 3600): Promise<{ url: string | null; error: any }> {
  if (USE_SUPABASE && supabase) {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, expiresInSec);
      if (error) {
        console.error('createSignedUrl_failed', { error, bucket, filePath });
        return { url: null, error };
      }
      return { url: data?.signedUrl || null, error: null };
    } catch (error) {
      console.error('createSignedUrl_exception', { error, bucket, filePath });
      return { url: null, error };
    }
  }

 
  const url = `${getBaseUrl()}/api/storage/${bucket}/${filePath}`;
  return { url, error: null };
}

export async function deleteImage(filePath: string): Promise<{ success: boolean; error: any }> {
  if (USE_SUPABASE && supabase) {
    try {
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([filePath]);
      
      if (error) {
        console.error('Error al eliminar imagen de Supabase:', { error, filePath });
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Excepción al eliminar imagen de Supabase:', { error, filePath });
      return { success: false, error };
    }
  }

  try {
    const fullPath = path.join(LOCAL_STORAGE_DIR, SUPABASE_BUCKET, filePath);
    await fs.unlink(fullPath).catch(() => {
    });
    return { success: true, error: null };
  } catch (error) {
    console.error('Error al eliminar imagen localmente:', { error, filePath });
    return { success: false, error };
  }
}

export function getImageUrl(filePath: string): string {
  if (USE_SUPABASE && supabase) {
    const { data: { publicUrl } } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(filePath);
    return publicUrl;
  }

  return `${getBaseUrl()}/api/storage/${SUPABASE_BUCKET}/${filePath}`;
}

export function getPublicUrlFor(bucket: string, filePath: string): string {
  if (USE_SUPABASE && supabase) {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    return publicUrl;
  }

  return `${getBaseUrl()}/api/storage/${bucket}/${filePath}`;
}
