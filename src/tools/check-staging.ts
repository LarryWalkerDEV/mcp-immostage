import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callApp } from '../lib/app-client.js';
import { fetchImageAsBase64 } from '../lib/image-to-base64.js';

/**
 * check_staging — returns the download URL for a staging job once it is ready.
 * Staging is async (kie.ai can take up to ~90s), so stage_room returns a job_id
 * and the client polls here.
 */
export function registerCheckStaging(server: McpServer, apiKey: string) {
  server.tool(
    'check_staging',
    'Prüft den Status eines Staging-Auftrags und gibt die Download-URL zurück, sobald das Bild fertig ist. Rufe dies mit der job_id aus stage_room auf; wiederhole nach ein paar Sekunden, wenn noch „in Bearbeitung".',
    {
      job_id: z.string().describe('Die Auftrags-ID (jobId) aus der stage_room-Antwort'),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ job_id }) => {
      const res = await callApp<{ status?: string; downloadUrl?: string; error?: string }>(
        '/api/mcp/status',
        apiKey,
        { jobId: job_id }
      );
      if (!res.ok) {
        return {
          content: [{ type: 'text' as const, text: res.data.error || 'Auftrag nicht gefunden.' }],
          isError: true,
        };
      }
      if (res.data.status === 'completed' && res.data.downloadUrl) {
        // Inline preview (image first, then text). Null-guard pattern from floor-plan.ts.
        // ponytail: preview relies on the app returning <=800KB Supabase 'staged' JPEGs
        // (persisted by /api/mcp/status); ceiling = raw kie URLs (1.7-2MB PNGs) degrade
        // to text-only; upgrade path = pure-JS resize in this repo.
        const img = await fetchImageAsBase64(res.data.downloadUrl);
        if (img) {
          return {
            content: [
              { type: 'image' as const, data: img.data, mimeType: img.mimeType },
              { type: 'text' as const, text: `Fertig! Download: ${res.data.downloadUrl}` },
            ],
          };
        }
        return { content: [{ type: 'text' as const, text: `Fertig! Download: ${res.data.downloadUrl}` }] };
      }
      if (res.data.status === 'failed') {
        return {
          content: [{ type: 'text' as const, text: `Staging fehlgeschlagen: ${res.data.error || 'unbekannter Fehler'}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: 'Noch in Bearbeitung — bitte in ein paar Sekunden erneut prüfen.' }],
      };
    }
  );
}
