import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

/**
 * Upload a base64-encoded image to Supabase Storage and return a public URL.
 * Used when Claude Desktop users paste images directly (no public URL available).
 * Files are stored in the 'mcp-uploads' bucket with a 24h expiry path convention.
 */
export async function uploadBase64Image(base64Data: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase not configured on this server. Please provide a public image URL instead.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Strip data URI prefix if present
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  // Detect format from first bytes
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
  const ext = isPng ? 'png' : 'jpg';
  const contentType = isPng ? 'image/png' : 'image/jpeg';

  const fileName = `mcp-uploads/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from('staging-images')
    .upload(fileName, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('staging-images')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
