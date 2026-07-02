import { describe, it, expect } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import metadataHandler from './oauth-protected-resource.js';
import mcpHandler from './mcp.js';

// ponytail: minimal handler-level stubs, no HTTP server needed
function mockRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader(key: string, value: string) {
      headers[key] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    end() {
      return res;
    },
    headers,
    headersSent: false,
  };
  return res;
}

describe('GET /.well-known/oauth-protected-resource (RFC 9728)', () => {
  it('returns protected resource metadata with host-derived resource URL', () => {
    const req = {
      method: 'GET',
      headers: { host: 'mcp.immostage.ai' },
    } as unknown as VercelRequest;
    const res = mockRes();

    metadataHandler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json');
    const body = res.body as Record<string, unknown>;
    expect(body.resource).toBe('https://mcp.immostage.ai/api/mcp');
    expect(body.authorization_servers).toEqual(['https://app.immostage.ai']);
    expect(body.bearer_methods_supported).toEqual(['header']);
  });
});

describe('POST /api/mcp without Authorization', () => {
  it('returns 401 with WWW-Authenticate pointing at the resource metadata', async () => {
    const req = {
      method: 'POST',
      headers: { host: 'mcp.immostage.ai' },
      body: { jsonrpc: '2.0', method: 'initialize', id: 1, params: {} },
    } as unknown as VercelRequest;
    const res = mockRes();

    await mcpHandler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(401);
    expect(res.headers['WWW-Authenticate']).toMatch(
      /^Bearer resource_metadata="https:\/\/mcp\.immostage\.ai\/\.well-known\/oauth-protected-resource"$/
    );
    expect(res.headers['Access-Control-Expose-Headers']).toContain('WWW-Authenticate');
  });
});
