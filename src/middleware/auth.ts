export interface AuthResult {
  valid: boolean;
  apiKey?: string;
  error?: string;
}

/**
 * Presence check only. The real authority is the ImmoStage app:
 * /api/mcp/* resolves the key to a tenant and enforces billing. Here we just
 * require a non-empty Bearer token so unauthenticated calls fail fast.
 */
export function validateApiKey(authHeader: string | null | undefined): AuthResult {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing Authorization header. Use: Bearer YOUR_IMMOSTAGE_KEY' };
  }
  const key = authHeader.slice(7).trim();
  if (!key) {
    return { valid: false, error: 'Empty API key' };
  }
  return { valid: true, apiKey: key };
}
