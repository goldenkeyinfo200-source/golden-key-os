import { assertSupabaseConfigured, supabaseAdmin } from '../config/supabase.js';

export const DOCUMENTS_BUCKET =
  process.env.SUPABASE_DOCUMENTS_BUCKET?.trim() || 'documents';

export async function uploadStorageFile({
  storagePath,
  buffer,
  mimeType,
}) {
  assertSupabaseConfigured();

  const { data, error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    const uploadError = new Error(
      `Файлни Supabase Storage'га юклаб бўлмади: ${error.message}`
    );
    uploadError.status = 500;
    throw uploadError;
  }

  return data;
}

export async function deleteStorageFile(storagePath) {
  if (!storagePath) {
    return;
  }

  assertSupabaseConfigured();

  const { error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .remove([storagePath]);

  if (error) {
    const deleteError = new Error(
      `Файлни Supabase Storage'дан ўчириб бўлмади: ${error.message}`
    );
    deleteError.status = 500;
    throw deleteError;
  }
}

export async function createSignedFileUrl(
  storagePath,
  expiresInSeconds = 3600
) {
  if (!storagePath) {
    return null;
  }

  if (/^https?:\/\//i.test(storagePath)) {
    return storagePath;
  }

  assertSupabaseConfigured();

  const { data, error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error('Signed URL яратиш хатоси:', error);
    return null;
  }

  return data?.signedUrl || null;
}
