import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callApp } from '../lib/app-client.js';

/**
 * stage_room — thin proxy to the ImmoStage app. All compute + billing happen
 * server-side; the tool returns a download URL. The validated Bearer key is
 * threaded in via createServer() (stateless per-request server).
 */
export function registerStageRoom(server: McpServer, apiKey: string) {
  server.tool(
    'stage_room',
    'Virtuelles Staging: verwandelt ein leeres Raumfoto in einen möblierten Raum. Benötigt den Namen der Immobilie (z. B. "Hubertstraße 10"), ein Bild (öffentliche URL oder Base64), Stil und Raumtyp. Gibt eine Download-URL zurück. Die ersten 3 Bilder sind kostenlos.',
    {
      property_name: z.string().describe('Name/Adresse der Immobilie, z. B. "Hubertstraße 10, Berlin"'),
      image_url: z.string().url().optional().describe('Öffentliche URL des Raumfotos'),
      image_base64: z.string().optional().describe('Base64-Bilddaten, wenn der Nutzer ein Bild direkt einfügt'),
      style: z.enum(['modern', 'scandinavian', 'classic', 'minimal', 'luxury']).describe('Einrichtungsstil'),
      room_type: z
        .enum(['living_room', 'bedroom', 'kitchen', 'bathroom', 'office', 'other'])
        .describe('Raumtyp'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ property_name, image_url, image_base64, style, room_type }) => {
      // 1) ensure project (= property listing)
      const proj = await callApp<{ projectId?: string; error?: string }>(
        '/api/mcp/project',
        apiKey,
        { name: property_name }
      );
      if (!proj.ok || !proj.data.projectId) {
        return {
          content: [{ type: 'text' as const, text: proj.data.error || 'Projekt konnte nicht angelegt werden.' }],
          isError: true,
        };
      }

      // 2) stage
      const stage = await callApp<{
        downloadUrl?: string;
        error?: string;
        code?: string;
        checkoutUrl?: string;
      }>('/api/mcp/stage', apiKey, {
        projectId: proj.data.projectId,
        imageUrl: image_url,
        imageBase64: image_base64,
        style,
        roomType: room_type,
      });

      if (stage.data.code === 'UPGRADE_REQUIRED') {
        return {
          content: [
            {
              type: 'text' as const,
              text: `${stage.data.error}\n\nJetzt upgraden: ${stage.data.checkoutUrl || 'https://immostage.ai/preise'}`,
            },
          ],
        };
      }
      if (!stage.ok || !stage.data.downloadUrl) {
        return {
          content: [{ type: 'text' as const, text: stage.data.error || 'Staging fehlgeschlagen.' }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: `Fertig! Download: ${stage.data.downloadUrl}` }],
      };
    }
  );
}
