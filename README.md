# ImmoStage Virtual Staging MCP Server

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

AI-powered virtual staging MCP server for real estate professionals. Stage empty rooms with photorealistic furniture, then generate a full marketing package (social media posts, an Exposé PDF, and a property video) — all through the Model Context Protocol. Built for Immobilienmakler, PropTech platforms, and real estate photographers in the DACH market.

## Quick Start

Connect your MCP client to the ImmoStage server:

**Server URL:** `https://mcp.immostage.ai/api/mcp`

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "immostage": {
      "url": "https://mcp.immostage.ai/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Or install via the Claude Code CLI:

```
claude mcp add --transport http immostage https://mcp.immostage.ai/api/mcp --header "Authorization: Bearer YOUR_KEY"
```

### Getting an API Key

Self-service — no need to contact anyone. Create your Bearer key at [app.immostage.ai](https://app.immostage.ai), under **Einstellungen → "Claude / MCP Zugang"**.

The first **3 staging images per account are free**. After that, pick a plan:

| Plan | Price |
|------|-------|
| Einzel | 29 € einmalig |
| Starter | 49 € / Monat |
| Pro | 199 € / Monat, unbegrenzt |

## Tools

Call these in order: `stage_room` → `check_staging` → (optional) `generate_marketing` → `get_download_link`.

| Tool | Description | Latency |
|------|-------------|---------|
| `stage_room` | Submits an empty-room photo for AI virtual staging. Returns a `job_id` to poll. | Async, ~30-90s |
| `check_staging` | Polls a staging job by `job_id`. Returns the staged image (inline preview) and its download URL once ready. | Poll until done |
| `generate_marketing` | Generates the full marketing package from staged rooms: 6 social media posts, an Exposé (PDF), and a property video (video requires the Pro plan). | Async, minutes |
| `get_download_link` | Returns the download page for a property: all generated assets as a ZIP (valid 3 days), plus a permanent dashboard link. | Instant |

> **Roadmap:** Floor-plan beautification, room classification, listing-copy optimization, and style suggestion are planned for a future release and are not yet registered as callable tools.

## Usage Examples

### Stage an empty room

```
Stage this room in modern style: https://example.com/empty-living-room.jpg
```

The `stage_room` tool accepts:
- `property_name` — Name/address of the property, e.g. `"Hubertstraße 10, Berlin"`
- `image_url` — Public URL to the room photo (or `image_base64` to paste an image directly)
- `style` — `modern`, `scandinavian`, `classic`, `minimal`, or `luxury`
- `room_type` — `living_room`, `bedroom`, `kitchen`, `bathroom`, `office`, or `other`

Returns a `job_id` — poll it with `check_staging` until the staged image is ready.

### Check a staging job

```
Check the status of job abc123
```

The `check_staging` tool accepts:
- `job_id` — the job ID returned by `stage_room`

Returns the staged image inline (once ready) plus its download URL, or a "still processing" message to poll again.

### Generate the marketing package

```
Generate the marketing package for Hubertstraße 10, Berlin
```

The `generate_marketing` tool accepts:
- `property_name` — same property name used with `stage_room`

Starts async generation of 6 social media posts, an Exposé (PDF), and a property video (the video requires the Pro plan; other plans get an upgrade link instead). Call `get_download_link` afterward to retrieve the assets.

### Get the download link

```
Get the download link for Hubertstraße 10, Berlin
```

The `get_download_link` tool accepts:
- `property_name` — same property name used with `stage_room`

Returns a share link (valid 3 days) to a page with all assets bundled as a ZIP, plus a permanent link to the ImmoStage dashboard.

## Authentication

All requests require a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

Create your key at [app.immostage.ai](https://app.immostage.ai) → Einstellungen → "Claude / MCP Zugang" (see [Getting an API Key](#getting-an-api-key) above). The first 3 staging images per account are free.

## Rate Limits

- **100 requests/minute** per API key
- Rate limit headers included in responses (`X-RateLimit-Remaining`)
- Staging and marketing-package generation consume credits based on your plan

## Links

- [ImmoStage Homepage](https://immostage.ai) — AI Virtual Staging Platform
- [GitHub](https://github.com/LarryWalkerDEV/mcp-immostage) — Source Code

## License

[MIT](./LICENSE) — Copyright 2026 [ImmoStage](https://immostage.ai)
