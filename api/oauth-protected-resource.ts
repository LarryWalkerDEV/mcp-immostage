import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * RFC 9728 OAuth Protected Resource Metadata.
 * Claude fetches this (via the WWW-Authenticate pointer on 401) to discover
 * the authorization server. The app (app.immostage.ai) is the sole auth
 * authority — issue #28 owns the authorize/token/register endpoints there.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  // ponytail: host derived from the request so prod (mcp.immostage.ai),
  // vercel.app, and preview deploys all advertise the correct resource URL
  res.status(200).json({
    resource: `https://${req.headers.host}/api/mcp`,
    authorization_servers: ['https://app.immostage.ai'],
    bearer_methods_supported: ['header'],
  });
}
