import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from '../src/server.js';
import { validateApiKey } from '../src/middleware/auth.js';
import { checkRateLimit } from '../src/lib/rate-limit.js';

export const config = {
  maxDuration: 120,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, WWW-Authenticate');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST for MCP requests.' });
    return;
  }

  try {
    // Auth check (mandatory — the app is the real authority for billing)
    const auth = validateApiKey(req.headers.authorization as string | undefined);
    if (!auth.valid) {
      // RFC 9728: point OAuth-capable clients (Claude) at the resource metadata
      res.setHeader(
        'WWW-Authenticate',
        `Bearer resource_metadata="https://${req.headers.host}/.well-known/oauth-protected-resource"`
      );
      res.status(401).json({ error: auth.error });
      return;
    }

    // Rate limit check (skip if Redis not configured)
    try {
      const rateLimit = await checkRateLimit(auth.apiKey!);
      if (!rateLimit.allowed) {
        const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
        res.status(429).json({ error: 'Rate limit exceeded', retryAfter });
        return;
      }
    } catch (rateLimitError) {
      console.warn('Rate limit check failed, allowing request:', rateLimitError);
    }

    // Create stateless MCP server + transport (thread the validated key)
    const server = createServer(auth.apiKey!);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
