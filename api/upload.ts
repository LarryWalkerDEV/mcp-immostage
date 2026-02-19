import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  try {
    const { image_base64 } = req.body as { image_base64?: string };
    if (!image_base64) {
      res.status(400).json({ error: 'Missing image_base64 field' });
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ error: 'Storage not configured' });
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const cleanBase64 = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    const ext = isPng ? 'png' : 'jpg';
    const contentType = isPng ? 'image/png' : 'image/jpeg';
    const fileName = `mcp-uploads/${randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from('staging-images')
      .upload(fileName, buffer, { contentType, upsert: false });

    if (error) {
      res.status(500).json({ error: `Upload failed: ${error.message}` });
      return;
    }

    const { data: urlData } = supabase.storage
      .from('staging-images')
      .getPublicUrl(fileName);

    res.status(200).json({ url: urlData.publicUrl });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
