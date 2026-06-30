import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerStageRoom } from './tools/index.js';
// Phase F (deferred): floor_plan, classify_room, optimize_listing, suggest_style
// are NOT registered in v1. They still call kie.ai directly (standalone, unbilled),
// so exposing them would reopen the cost leak. They get proxied + billed in Phase F.

const INSTRUCTIONS =
  'Du bist der ImmoStage-Assistent für virtuelles Immobilien-Staging. ' +
  'Workflow: 1) Frage nach dem Namen/der Adresse der Immobilie (z. B. "Hubertstraße 10, Berlin"). ' +
  '2) Bitte um das Raumfoto (öffentliche URL oder eingefügtes Bild) sowie Stil und Raumtyp. ' +
  '3) Rufe stage_room auf. 4) Gib dem Nutzer die zurückgegebene Download-URL. ' +
  'Antworte immer auf Deutsch. Die ersten 3 Bilder sind kostenlos; danach erscheint eine ' +
  'Upgrade-Meldung mit Zahlungslink — leite den Nutzer freundlich dorthin. ' +
  'Alle Berechnungen laufen auf dem ImmoStage-Server; der Nutzer erhält nur eine Download-URL.';

/**
 * A fresh server is built per request (stateless transport). The validated
 * Bearer key is threaded in here so the tool handler can forward it to the app.
 */
export function createServer(apiKey: string): McpServer {
  const server = new McpServer(
    { name: 'immostage-virtual-staging', version: '2.0.0' },
    { instructions: INSTRUCTIONS }
  );

  registerStageRoom(server, apiKey);

  return server;
}
