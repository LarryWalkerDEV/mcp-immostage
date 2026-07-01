import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callApp } from '../lib/app-client.js';

/**
 * generate_marketing — after rooms are staged, generate the full marketing set:
 * 6 Social-Media-Posts (Remotion), Exposé (PDF) und ein Immobilien-Video.
 * Alles läuft asynchron auf dem ImmoStage-Server; die fertigen Assets erscheinen
 * auf der Download-Website (get_download_link). Video benötigt einen Pro-Tarif.
 */
export function registerGenerateMarketing(server: McpServer, apiKey: string) {
  server.tool(
    'generate_marketing',
    'Erstellt aus den gestagten Bildern das komplette Marketing-Paket: 6 Social-Media-Posts, ein Exposé (PDF) und ein Immobilien-Video. Rufe dies auf, nachdem die Räume gestaged wurden. Läuft asynchron; die Ergebnisse erscheinen anschließend über get_download_link.',
    {
      property_name: z.string().describe('Name/Adresse der Immobilie, wie bei stage_room verwendet'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ property_name }) => {
      const proj = await callApp<{ projectId?: string; error?: string }>('/api/mcp/project', apiKey, {
        name: property_name,
      });
      if (!proj.ok || !proj.data.projectId) {
        return {
          content: [{ type: 'text' as const, text: proj.data.error || 'Immobilie nicht gefunden.' }],
          isError: true,
        };
      }

      const gen = await callApp<{ started?: string[]; note?: string; error?: string }>(
        '/api/mcp/generate',
        apiKey,
        { projectId: proj.data.projectId }
      );
      if (!gen.ok) {
        return {
          content: [{ type: 'text' as const, text: gen.data.error || 'Erstellung konnte nicht gestartet werden.' }],
          isError: true,
        };
      }
      const started = (gen.data.started || []).join(', ') || 'nichts';
      return {
        content: [
          {
            type: 'text' as const,
            text: `Erstellung gestartet (${started}). Das dauert einige Minuten. Rufe danach get_download_link auf — die fertigen Assets erscheinen auf der Download-Website.`,
          },
        ],
      };
    }
  );
}
