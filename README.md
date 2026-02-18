# ImmoStage Virtual Staging MCP Server

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

AI-powered virtual staging MCP server for real estate professionals. Stage empty rooms with photorealistic furniture, beautify floor plans into 3D renders, classify room images, generate German property descriptions, and get staging style recommendations — all through the Model Context Protocol. Built for Immobilienmakler, PropTech platforms, and real estate photographers in the DACH market.

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

Contact [goerz@immostage.ai](mailto:goerz@immostage.ai) for API access.

## Tools

| Tool | Description | Cost | Latency |
|------|-------------|------|---------|
| `stage_room` | AI virtual staging — transform empty room photos into beautifully furnished spaces | Uses credits | ~20-40s |
| `beautify_floor_plan` | Transform 2D floor plans into 3D isometric architectural renders | Uses credits | ~20-40s |
| `classify_room` | Classify room images: type, empty/furnished, quality score, style suggestion | Free | ~2s |
| `optimize_listing` | Generate professional German property descriptions from basic listing data | Free | ~3s |
| `suggest_style` | Get staging style recommendation based on room type and target audience | Free | Instant |

## Usage Examples

### Stage an empty living room

```
Stage this room in modern style: https://example.com/empty-living-room.jpg
```

The `stage_room` tool accepts:
- `image_url` — Public URL to the room image (JPEG/PNG)
- `style` — Staging style: `modern`, `skandinavisch`, `luxus`, `minimalistisch`, `boho`, `landhausstil`
- `room_type` — Room type: `wohnzimmer`, `schlafzimmer`, `kueche`, `bad`, `buero`, `kinderzimmer`, `flur`
- `quality` — Output quality: `draft` (fast) or `high` (detailed)

Returns staged image URLs ready for download or embedding.

### Classify then stage

```
First classify this room image, then stage it with the recommended style:
https://example.com/room-photo.jpg
```

The agent will:
1. Call `classify_room` to detect room type and suggest a style
2. Call `stage_room` with the detected room type and suggested style

### Optimize a property listing

```
Write a listing description for a 3-room apartment in Berlin-Mitte,
85m2, balcony, built 1998, renovated 2023, asking price 420,000 EUR.
```

The `optimize_listing` tool generates:
- Professional German property description (Exposé-ready)
- TLDR summary
- Key feature highlights
- SEO-optimized text

## Authentication

All requests require a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

Contact [goerz@immostage.ai](mailto:goerz@immostage.ai) for API access. Free tier includes 10 staging credits for testing.

## Rate Limits

- **100 requests/minute** per API key
- Rate limit headers included in responses (`X-RateLimit-Remaining`)
- Staging and floor plan tools consume credits based on your plan

## Links

- [ImmoStage Homepage](https://immostage.ai) — AI Virtual Staging Platform
- [GitHub](https://github.com/LarryWalkerDEV/mcp-immostage) — Source Code

## License

[MIT](./LICENSE) — Copyright 2026 [ImmoStage](https://immostage.ai)
