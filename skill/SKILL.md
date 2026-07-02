---
name: immostage-staging
description: Virtuelles Immobilien-Staging über ImmoStage direkt in Claude. Verwandelt leere Raumfotos in möblierte Räume und gibt eine Download-URL zurück. Use when the user wants to virtually stage a room photo, furnish an empty property image, or asks for "Home Staging", "virtuelles Staging", "Raum möblieren", or "Immobilienfoto aufwerten".
---

# ImmoStage — Virtuelles Staging in Claude

This skill drives the ImmoStage MCP connector. The MCP runs all compute on ImmoStage's
servers; you only collect inputs and hand back a download URL. Always respond in **German**.

## Setup (guide the user if the connector is missing)

1. Konto auf https://immostage.ai erstellen (3 kostenlose Bilder).
2. Im Dashboard unter **Einstellungen → Claude / MCP Zugang** einen Schlüssel erstellen.
3. In Claude einen Custom Connector hinzufügen:
   - URL: `https://mcp-immostage.vercel.app/api/mcp`
   - Authentifizierung: Bearer-Token = der `mcp_live_…`-Schlüssel aus dem Dashboard.

If a tool call returns "Ungültiger Zugang", the key is missing, wrong, or revoked — point the
user to the dashboard to create a new one.

## Optionen anbieten

Frage zuerst, **was der Nutzer für seine Immobilie erstellen möchte**, und zeige die Optionen:

- **Virtuelles Staging** — leere Räume möblieren (verfügbar)
- **Marketing-Paket** — 6 Social-Media-Posts, Exposé (PDF) und Immobilien-Video (verfügbar;
  das Video nur im Pro-Tarif)
- **Grundriss-Verschönerung** — in Kürze

## Workflow (Staging)

1. **Frage nach dem Namen/der Adresse der Immobilie** (z. B. „Hubertstraße 10, Berlin"). This
   groups the work into a project.
2. **Sammle pro Raum:** das Foto (öffentliche URL oder direkt eingefügtes Bild), den **Stil**
   (`modern`, `scandinavian`, `classic`, `minimal`, `luxury`) und den **Raumtyp**
   (`living_room`, `bedroom`, `kitchen`, `bathroom`, `office`, `other`).
3. **Rufe `stage_room`** mit `property_name`, Bild, `style`, `room_type` auf. Die Antwort enthält
   eine `job_id` (Staging läuft asynchron, i. d. R. 30–90 s).
4. **Rufe `check_staging`** mit der `job_id` auf. Kommt „Noch in Bearbeitung", nach ein paar
   Sekunden erneut prüfen. Wiederhole Schritt 2–4 für weitere Räume.
5. **Optional: Möchte der Nutzer mehr als Bilder, rufe `generate_marketing`** mit dem
   `property_name` auf — es erstellt 6 Social-Media-Posts, ein Exposé (PDF) und ein
   Immobilien-Video (asynchron, einige Minuten). Das Immobilien-Video erfordert den
   **Pro-Tarif**; weise Trial-/Starter-Nutzer vorab darauf hin. Meldet das Tool übersprungene
   Funktionen, gib den Hinweis samt Upgrade-Link unverändert weiter.
6. **Wenn der Nutzer fertig ist, rufe `get_download_link`** mit dem `property_name` auf und gib
   ihm die **Download-Website**: eine Seite mit allen Assets in strukturierten Ordnern (ZIP),
   3 Tage gültig. Zusätzlich liefert das Tool den dauerhaften Link zum ImmoStage-Dashboard des
   Projekts (Login erforderlich) — dort bleiben die Assets über die 3 Tage hinaus verfügbar.

## Billing — handle gracefully

- Jedes Konto enthält **3 kostenlose Bilder**.
- Danach antwortet das Tool mit einer **Upgrade-Meldung inkl. Zahlungslink** (statt eines Bildes).
  Gib die Meldung und den Link unverändert weiter. Es gibt zwei Wege: die **Projekt-Freischaltung
  (49 € einmalig pro Projekt)** oder **Pro (199 €/Monat, 5 Projekte monatlich)**. Erkläre
  freundlich, dass nach dem Kauf derselbe Schlüssel sofort weiterfunktioniert — kein
  Neuinstallieren nötig.
- Erfinde niemals eine Download-URL. Wenn keine zurückkommt, gib die Fehlermeldung des Tools wieder.

## Notes

- Fotos sollten leere oder spärlich möblierte Räume zeigen; gute Beleuchtung hilft.
- Die Verarbeitung dauert i. d. R. unter 60 Sekunden pro Bild.
