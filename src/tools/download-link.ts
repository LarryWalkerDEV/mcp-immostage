import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callApp } from '../lib/app-client.js';

/**
 * get_download_link — returns the customer-facing download website for a property.
 * The page lists all generated assets (staged images, and later floor plans, video,
 * social) with a one-click ZIP download in structured folders. The link expires
 * after 3 days; the assets stay in the customer's ImmoStage account.
 */
export function registerDownloadLink(server: McpServer, apiKey: string) {
  server.tool(
    'get_download_link',
    'Erstellt die Download-Website für eine Immobilie: eine Seite mit allen erstellten Assets (Staging-Bilder usw.) und einem ZIP-Download in strukturierten Ordnern. Der Link ist 3 Tage gültig. Rufe dies auf, wenn der Nutzer alle Ergebnisse einer Immobilie herunterladen möchte.',
    {
      property_name: z.string().describe('Name/Adresse der Immobilie, wie bei stage_room verwendet'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ property_name }) => {
      // Resolve (or reuse) the project for this property.
      const proj = await callApp<{ projectId?: string; error?: string }>('/api/mcp/project', apiKey, {
        name: property_name,
      });
      if (!proj.ok || !proj.data.projectId) {
        return {
          content: [{ type: 'text' as const, text: proj.data.error || 'Immobilie nicht gefunden.' }],
          isError: true,
        };
      }

      const share = await callApp<{ shareUrl?: string; expiresAt?: string; error?: string }>(
        '/api/mcp/share',
        apiKey,
        { projectId: proj.data.projectId }
      );
      if (!share.ok || !share.data.shareUrl) {
        return {
          content: [{ type: 'text' as const, text: share.data.error || 'Download-Link konnte nicht erstellt werden.' }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: `Alle Assets für „${property_name}" hier herunterladen (3 Tage gültig):\n${share.data.shareUrl}\n\nAuf der Seite auf „Alle Assets herunterladen (ZIP)" klicken — die Dateien sind in Ordnern strukturiert.`,
          },
        ],
      };
    }
  );
}
