import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import { supabase } from './supabase';

const DEFAULT_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_PRODUCTS_BUCKET || 'productos';

export interface PickedProductImage {
  uri: string;
  base64: string;
  mimeType: string;
}

function getFileExtension(uri: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return (match?.[1] || 'jpg').toLowerCase();
}

function getMimeType(extension: string) {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'jpeg':
    case 'jpg':
    default:
      return 'image/jpeg';
  }
}

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase no esta configurado.');
  }
  return supabase;
}

export async function pickImageFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Se requiere permiso de galeria para subir imagenes.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
    base64: true,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];

  if (!asset.base64) {
    throw new Error('No se pudo leer la imagen seleccionada. Intenta nuevamente.');
  }

  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: asset.mimeType || getMimeType(getFileExtension(asset.uri)),
  };
}

export async function uploadProductImage(image: PickedProductImage) {
  const client = ensureSupabase();

  const extension = getFileExtension(image.uri);
  const contentType = image.mimeType;
  const fileName = `producto-${Date.now()}-${Math.floor(Math.random() * 100000)}.${extension}`;
  const filePath = `productos/${fileName}`;
  const arrayBuffer = decode(image.base64);

  const { error: uploadError } = await client.storage
    .from(DEFAULT_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = client.storage.from(DEFAULT_BUCKET).getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error('No se pudo obtener la URL publica de la imagen.');
  }

  return data.publicUrl;
}
