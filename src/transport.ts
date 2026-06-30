import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';
import { validateApiKey } from './middleware/auth.js';
import { checkRateLimit } from './lib/rate-limit.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// CORS headers
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  if (_req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());

// MCP endpoint
app.post('/api/mcp', async (req, res) => {
  // Auth check
  const auth = validateApiKey(req.headers.authorization);
  if (!auth.valid) {
    res.status(401).json({ error: auth.error });
    return;
  }

  // Rate limit check
  const rateLimit = await checkRateLimit(auth.apiKey!);
  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter,
    });
    return;
  }

  // Create a fresh MCP server + stateless transport for each request (thread the validated key)
  const server = createServer(auth.apiKey!);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless — no session tracking
  });

  await server.connect(transport);

  // Let the transport handle the request/response
  await transport.handleRequest(req, res, req.body);
});

// Handle GET and DELETE for SSE/session management (required by spec)
app.get('/api/mcp', async (_req, res) => {
  res.status(405).json({ error: 'Method not allowed. Use POST for MCP requests.' });
});

app.delete('/api/mcp', async (_req, res) => {
  res.status(405).json({ error: 'Session management not supported in stateless mode.' });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'immostage-virtual-staging', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`ImmoStage MCP Server running on http://localhost:${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/api/mcp`);
});
