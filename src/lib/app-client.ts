export const APP_URL = process.env.APP_URL || 'https://app.immostage.ai';

/**
 * Server-to-server call into the ImmoStage app's /api/mcp/* endpoints,
 * forwarding the user's MCP key as a Bearer token. The app enforces billing.
 */
export async function callApp<T = any>(
  path: string,
  key: string,
  body: unknown
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${APP_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}
