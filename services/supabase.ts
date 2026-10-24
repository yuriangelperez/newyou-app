import AsyncStorage from '@react-native-async-storage/async-storage';

import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

const BUCKET_PRODUCTOS_FOTOS = 'productos-fotos';

/**
 * Sube una imagen (Base64) al bucket `productos-fotos` y devuelve su URL pública.
 */
export async function subirImagenProducto(
  base64: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const filePath = `${Date.now()}-${Math.floor(Math.random() * 100000)}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_PRODUCTOS_FOTOS)
    .upload(filePath, decode(base64), { contentType: mimeType, upsert: false });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET_PRODUCTOS_FOTOS).getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error('No se pudo obtener la URL pública de la imagen.');
  }

  return data.publicUrl;
}
