import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callApp } from '../../lib/app-client.js';
import { registerGenerateMarketing } from '../generate-marketing.js';

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
  registerGenerateMarketing(server as never, 'mcp_live_test');
  if (!handler) throw new Error('tool handler was not registered');
  return handler;
}

describe('generate_marketing', () => {
  beforeEach(() => {
    vi.mocked(callApp).mockReset();
  });

  it('appends a German Hinweis with the upgrade URL when the app skips the video (pro_required)', async () => {
    vi.mocked(callApp)
      .mockResolvedValueOnce({ ok: true, status: 200, data: { projectId: 'p1' } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          started: ['social', 'expose'],
          skipped: [{ feature: 'video', reason: 'pro_required', upgradeUrl: 'https://x' }],
        },
      });

    const result = await captureHandler()({ property_name: 'Hubertstraße 10, Berlin' });
    const text = result.content[0].text;

    expect(text).toContain('Erstellung gestartet (social, expose)');
    expect(text).toContain('Hinweis: Das Immobilien-Video ist im Pro-Plan enthalten.');
    expect(text).toContain('Jetzt upgraden: https://x');
  });

  it('deduplicates skipped entries sharing the same reason and upgradeUrl into one Hinweis', async () => {
    vi.mocked(callApp)
      .mockResolvedValueOnce({ ok: true, status: 200, data: { projectId: 'p1' } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          started: ['social', 'expose'],
          skipped: [
            { feature: 'video', reason: 'pro_required', upgradeUrl: 'https://x' },
            { feature: 'transition', reason: 'pro_required', upgradeUrl: 'https://x' },
          ],
        },
      });

    const result = await captureHandler()({ property_name: 'Hubertstraße 10, Berlin' });
    const text = result.content[0].text;

    expect(text).toContain('Immobilien-Video und Video-Übergänge sind im Pro-Plan enthalten.');
    expect(text.match(/Hinweis:/g)).toHaveLength(1);
    expect(text.match(/https:\/\/x/g)).toHaveLength(1);
  });

  it('returns exactly today\'s success text when the response has no skipped[] (backward compatible)', async () => {
    vi.mocked(callApp)
      .mockResolvedValueOnce({ ok: true, status: 200, data: { projectId: 'p1' } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { started: ['social', 'expose', 'video'] },
      });

    const result = await captureHandler()({ property_name: 'Hubertstraße 10, Berlin' });
    const text = result.content[0].text;

    expect(text).toBe(
      'Erstellung gestartet (social, expose, video). Das dauert einige Minuten. Rufe danach get_download_link auf — die fertigen Assets erscheinen auf der Download-Website.'
    );
    expect(text).not.toContain('Hinweis');
  });
});
