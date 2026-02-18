export interface AuthResult {
  valid: boolean;
  apiKey?: string;
  error?: string;
}

export function validateApiKey(authHeader: string | null | undefined): AuthResult {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header. Use: Bearer YOUR_API_KEY' };
  }

  const key = authHeader.slice(7).trim();
  if (!key) {
    return { valid: false, error: 'Empty API key' };
  }

  const validKeys = (process.env.MCP_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean);
  if (validKeys.length === 0) {
    return { valid: false, error: 'Server misconfigured: no API keys set' };
  }

  if (!validKeys.includes(key)) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: true, apiKey: key };
}
