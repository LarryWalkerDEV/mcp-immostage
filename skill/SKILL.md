---
name: immostage-staging
description: Virtuelles Immobilien-Staging über ImmoStage direkt in Claude. Verwandelt leere Raumfotos in möblierte Räume und gibt eine Download-URL zurück. Use when the user wants to virtually stage a room photo, furnish an empty property image, or asks for "Home Staging", "virtuelles Staging", "Raum möblieren", or "Immobilienfoto aufwerten".
---

# ImmoStage — Virtuelles Staging in Claude

This skill drives the ImmoStage MCP connector. The MCP runs all compute on ImmoStage's
servers; you only collect inputs and hand back a download URL. Always respond in **German**.

## Setup (guide the user if the connector is missing)

1. Konto auf https://immostage.ai erstellen (3 Bilder kostenlos).
2. Im Dashboard unter **Einstellungen → Claude / MCP Zugang** einen Schlüssel erstellen.
3. In Claude einen Custom Connector hinzufügen:
   - URL: `https://mcp-immostage.vercel.app/api/mcp`
   - Authentifizierung: Bearer-Token = der `mcp_live_…`-Schlüssel aus dem Dashboard.

If a tool call returns "Ungültiger Zugang", the key is missing, wrong, or revoked — point the
user to the dashboard to create a new one.

## Workflow

1. **Frage nach dem Namen/der Adresse der Immobilie** (z. B. „Hubertstraße 10, Berlin"). This
   groups the work into a project.
2. **Sammle pro Raum:** das Foto (öffentliche URL oder direkt eingefügtes Bild), den **Stil**
   (`modern`, `scandinavian`, `classic`, `minimal`, `luxury`) und den **Raumtyp**
   (`living_room`, `bedroom`, `kitchen`, `bathroom`, `office`, `other`).
3. **Rufe `stage_room`** mit `property_name`, Bild, `style`, `room_type` auf.
4. **Gib dem Nutzer die Download-URL** aus der Antwort. Biete an, weitere Räume zu stagen.

## Billing — handle gracefully

- Die ersten **3 Bilder pro Konto** sind kostenlos.
- Danach antwortet das Tool mit einer **Upgrade-Meldung inkl. Zahlungslink** (statt eines Bildes).
  Gib die Meldung und den Link unverändert weiter und erkläre freundlich, dass nach dem Upgrade
  auf **Pro (199 €/Monat, unbegrenzt)** derselbe Schlüssel sofort weiterfunktioniert — kein
  Neuinstallieren nötig.
- Erfinde niemals eine Download-URL. Wenn keine zurückkommt, gib die Fehlermeldung des Tools wieder.

## Notes

- Fotos sollten leere oder spärlich möblierte Räume zeigen; gute Beleuchtung hilft.
- Die Verarbeitung dauert i. d. R. unter 60 Sekunden pro Bild.
