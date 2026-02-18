import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type Style = 'modern' | 'scandinavian' | 'classic' | 'minimal' | 'luxury';

interface StyleRec {
  style: Style;
  reasoning: string;
  alternatives: Style[];
}

const AUDIENCE_STYLES: Record<string, StyleRec> = {
  young_professionals: {
    style: 'modern',
    reasoning: 'Young professionals prefer clean, contemporary designs with functional aesthetics.',
    alternatives: ['scandinavian', 'minimal'],
  },
  families: {
    style: 'scandinavian',
    reasoning: 'Families gravitate toward warm, inviting Scandinavian design with natural materials.',
    alternatives: ['modern', 'classic'],
  },
  luxury_buyers: {
    style: 'luxury',
    reasoning: 'Luxury buyers expect premium finishes, rich textures, and sophisticated elegance.',
    alternatives: ['classic', 'modern'],
  },
  investors: {
    style: 'minimal',
    reasoning: 'Investors want neutral, broad-appeal staging that maximizes buyer pool.',
    alternatives: ['modern', 'scandinavian'],
  },
  seniors: {
    style: 'classic',
    reasoning: 'Seniors often prefer timeless, classic interiors with warm and familiar aesthetics.',
    alternatives: ['scandinavian', 'luxury'],
  },
};

const ROOM_STYLES: Record<string, Style> = {
  living_room: 'modern',
  bedroom: 'scandinavian',
  kitchen: 'modern',
  bathroom: 'minimal',
  office: 'minimal',
  other: 'modern',
};

const PROPERTY_OVERRIDES: Record<string, StyleRec> = {
  penthouse: {
    style: 'luxury',
    reasoning: 'Penthouses are best presented with luxury staging to match buyer expectations.',
    alternatives: ['modern', 'classic'],
  },
  loft: {
    style: 'modern',
    reasoning: 'Loft spaces suit industrial-modern aesthetics with open-plan layouts.',
    alternatives: ['minimal', 'scandinavian'],
  },
  studio: {
    style: 'minimal',
    reasoning: 'Studios benefit from minimal staging that maximizes perceived space.',
    alternatives: ['scandinavian', 'modern'],
  },
};

export function registerSuggestStyle(server: McpServer) {
  server.tool(
    'suggest_style',
    'Get staging style recommendations based on room type and target audience.',
    {
      room_type: z
        .enum(['living_room', 'bedroom', 'kitchen', 'bathroom', 'office', 'other'])
        .describe('Type of room to stage'),
      target_audience: z
        .enum(['young_professionals', 'families', 'luxury_buyers', 'investors', 'seniors'])
        .optional()
        .describe('Target buyer demographic'),
      property_type: z
        .enum(['apartment', 'house', 'penthouse', 'loft', 'studio'])
        .optional()
        .describe('Type of property'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ room_type, target_audience, property_type }) => {
      // Priority: property override > audience > room default
      let rec: StyleRec;

      if (property_type && PROPERTY_OVERRIDES[property_type]) {
        rec = PROPERTY_OVERRIDES[property_type];
      } else if (target_audience && AUDIENCE_STYLES[target_audience]) {
        rec = AUDIENCE_STYLES[target_audience];
      } else {
        const style = ROOM_STYLES[room_type] || 'modern';
        const allStyles: Style[] = ['modern', 'scandinavian', 'classic', 'minimal', 'luxury'];
        rec = {
          style,
          reasoning: `Default recommendation for ${room_type.replace('_', ' ')} based on market data.`,
          alternatives: allStyles.filter((s) => s !== style).slice(0, 2),
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              style: rec.style,
              reasoning: rec.reasoning,
              alternatives: rec.alternatives,
              roomType: room_type,
              targetAudience: target_audience || null,
              propertyType: property_type || null,
            }),
          },
        ],
      };
    }
  );
}
