import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callApp } from '../../lib/app-client.js';
import { registerDownloadLink } from '../download-link.js';

vi.mock('../../lib/app-client.js', () => ({
  callApp: vi.fn(),
  APP_URL: 'https://app.immostage.ai',
}));

type ToolResult = { content: { type: string; text: string }[]; isError?: boolean };
type Handler = (args: Record<string, unknown>) => Promise<ToolResult>;

/** Register the tool against a stub McpServer and capture the handler (last arg). */
function captureHandler(): Handler {
  let handler: Handler | undefined;
  const server = {
    tool: (...args: unknown[]) => {
      handler = args[args.length - 1] as Handler;
    },
  };
  registerDownloadLink(server as never, 'mcp_live_test');
  if (!handler) throw new Error('tool handler was not registered');
  return handler;
}

describe('get_download_link', () => {
  beforeEach(() => {
    vi.mocked(callApp).mockReset();
  });

  it('returns BOTH the 3-day share URL and the permanent dashboard URL', async () => {
    vi.mocked(callApp)
      .mockResolvedValueOnce({ ok: true, status: 200, data: { projectId: 'proj-42' } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { shareUrl: 'https://app.immostage.ai/share/abc123' },
      });

    const result = await captureHandler()({ property_name: 'Hubertstraße 10, Berlin' });
    const text = result.content[0].text;

    expect(text).toContain('https://app.immostage.ai/share/abc123');
    expect(text).toContain('https://app.immostage.ai/projects/proj-42');
    expect(text).toContain('Dauerhaft verfügbar in Ihrem ImmoStage-Dashboard');
    expect(text).toContain('Login erforderlich');
    expect(text).toContain('läuft nach 3 Tagen ab');
  });
});
