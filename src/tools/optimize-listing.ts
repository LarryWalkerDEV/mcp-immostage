import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callOpenRouter } from '../lib/openrouter-client.js';
import { LISTING_SYSTEM_PROMPT } from '../lib/prompts.js';

export function registerOptimizeListing(server: McpServer) {
  server.tool(
    'optimize_listing',
    'Generate professional German property descriptions from basic listing data.',
    {
      property_name: z.string().describe('Name or title of the property'),
      address: z.string().describe('Property address or location'),
      area_sqm: z.number().positive().describe('Living area in square meters'),
      rooms: z.number().positive().describe('Number of rooms'),
      floor: z.number().optional().describe('Floor number (optional)'),
      features: z.array(z.string()).optional().describe('List of features (e.g. balcony, garage)'),
      notes: z.string().optional().describe('Additional notes about the property'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ property_name, address, area_sqm, rooms, floor, features, notes }) => {
      try {
        const parts = [
          `Objektname: ${property_name}`,
          `Adresse: ${address}`,
          `Wohnfläche: ${area_sqm} m²`,
          `Zimmer: ${rooms}`,
        ];
        if (floor !== undefined) parts.push(`Etage: ${floor}`);
        if (features?.length) parts.push(`Ausstattung: ${features.join(', ')}`);
        if (notes) parts.push(`Hinweise: ${notes}`);

        const userPrompt = `Erstelle einen ansprechenden Beschreibungstext für dieses Objekt:\n\n${parts.join('\n')}`;

        const raw = await callOpenRouter({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: LISTING_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 1500,
        });

        // Strip markdown fences if present
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                description: parsed.description || '',
                tldr: parsed.tldr || '',
                keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures : [],
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: (error as Error).message,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
