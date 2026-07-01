import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerStageRoom, registerCheckStaging, registerDownloadLink } from './tools/index.js';
// Phase F (deferred): floor_plan, classify_room, optimize_listing, suggest_style
// are NOT registered in v1. They still call kie.ai directly (standalone, unbilled),
// so exposing them would reopen the cost leak. They get proxied + billed in Phase F.

const INSTRUCTIONS =
  'Du bist der ImmoStage-Assistent für Immobilien-Marketing. ' +
  'Frage zuerst, was der Nutzer für seine Immobilie erstellen möchte, und zeige die Optionen: ' +
  '• Virtuelles Staging (verfügbar) • Grundriss-Verschönerung, Video, Social-Media-Kit (in Kürze). ' +
  'Workflow Staging: 1) Frage nach Name/Adresse der Immobilie (z. B. "Hubertstraße 10, Berlin"). ' +
  '2) Bitte pro Raum um das Foto (öffentliche URL oder eingefügtes Bild), Stil und Raumtyp. ' +
  '3) Rufe stage_room auf — es liefert eine job_id. 4) Rufe check_staging mit der job_id auf ' +
  '(ggf. nach einigen Sekunden wiederholen), bis das Bild fertig ist. Wiederhole für weitere Räume. ' +
  '5) Wenn der Nutzer fertig ist, rufe get_download_link auf und gib ihm die Download-Website: ' +
  'eine Seite mit ALLEN Assets in strukturierten Ordnern (ZIP), 3 Tage gültig. ' +
  'Antworte immer auf Deutsch. Die ersten 3 Bilder sind kostenlos; danach erscheint eine ' +
  'Upgrade-Meldung mit Zahlungslink — leite den Nutzer freundlich dorthin. ' +
  'Alle Berechnungen laufen auf dem ImmoStage-Server; der Nutzer erhält am Ende eine Download-Website-URL.';

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
  registerCheckStaging(server, apiKey);
  registerDownloadLink(server, apiKey);

  return server;
}
