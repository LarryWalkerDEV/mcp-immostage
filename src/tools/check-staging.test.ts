import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerCheckStaging } from './check-staging.js';
import { callApp } from '../lib/app-client.js';
import { fetchImageAsBase64 } from '../lib/image-to-base64.js';

vi.mock('../lib/app-client.js', () => ({ callApp: vi.fn() }));
vi.mock('../lib/image-to-base64.js', () => ({ fetchImageAsBase64: vi.fn() }));

const mockedCallApp = vi.mocked(callApp);
const mockedFetchImage = vi.mocked(fetchImageAsBase64);

const DOWNLOAD_URL =
  'https://example.supabase.co/storage/v1/object/public/staged/mcp/tenant/staged-job-1.jpg';

/** Register against a stubbed server and extract the tool handler (last fn arg). */
function getHandler(): (input: { job_id: string }) => Promise<{
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}> {
  const server = { tool: vi.fn() };
  registerCheckStaging(server as any, 'test-key');
  const args = server.tool.mock.calls[0];
  return args[args.length - 1];
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('check_staging handler', () => {
  it('completed + image fetch ok -> image block first, then German text with URL', async () => {
    mockedCallApp.mockResolvedValue({
      ok: true,
      status: 200,
      data: { status: 'completed', downloadUrl: DOWNLOAD_URL },
    });
    mockedFetchImage.mockResolvedValue({ data: 'aGVsbG8=', mimeType: 'image/jpeg' });

    const result = await getHandler()({ job_id: 'job-1' });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(2);
    expect(result.content[0]).toEqual({
      type: 'image',
      data: 'aGVsbG8=',
      mimeType: 'image/jpeg',
    });
    expect(result.content[1].type).toBe('text');
    expect(result.content[1].text).toContain('Fertig! Download:');
    expect(result.content[1].text).toContain(DOWNLOAD_URL);
    expect(mockedFetchImage).toHaveBeenCalledWith(DOWNLOAD_URL);
  });

  it('completed + image fetch fails (null) -> text-only fallback, no isError', async () => {
    mockedCallApp.mockResolvedValue({
      ok: true,
      status: 200,
      data: { status: 'completed', downloadUrl: DOWNLOAD_URL },
    });
    mockedFetchImage.mockResolvedValue(null);

    const result = await getHandler()({ job_id: 'job-1' });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({
      type: 'text',
      text: `Fertig! Download: ${DOWNLOAD_URL}`,
    });
  });

  it('processing -> single text block, unchanged', async () => {
    mockedCallApp.mockResolvedValue({
      ok: true,
      status: 200,
      data: { status: 'processing' },
    });

    const result = await getHandler()({ job_id: 'job-1' });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'Noch in Bearbeitung — bitte in ein paar Sekunden erneut prüfen.',
    });
    expect(mockedFetchImage).not.toHaveBeenCalled();
  });

  it('failed -> text block with isError:true, unchanged', async () => {
    mockedCallApp.mockResolvedValue({
      ok: true,
      status: 200,
      data: { status: 'failed', error: 'kie Fehler' },
    });

    const result = await getHandler()({ job_id: 'job-1' });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({
      type: 'text',
      text: 'Staging fehlgeschlagen: kie Fehler',
    });
    expect(mockedFetchImage).not.toHaveBeenCalled();
  });
});
