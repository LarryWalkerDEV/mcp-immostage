import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { callOpenRouter } from '../lib/openrouter-client.js';
import { CLASSIFICATION_PROMPT, VALID_STYLES, VALID_ROOM_TYPES } from '../lib/prompts.js';

const VALID_CLASSIFICATIONS = [
  'interior_empty',
  'interior_furnished',
  'floor_plan',
  'exterior',
  'not_real_estate',
] as const;

export function registerClassifyRoom(server: McpServer) {
  server.tool(
    'classify_room',
    'Classify room images - detect room type, empty/furnished, quality, suggest style.',
    {
      image_url: z.string().url().describe('Public URL of the image to classify'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async ({ image_url }) => {
      try {
        const raw = await callOpenRouter({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: image_url } },
                { type: 'text', text: CLASSIFICATION_PROMPT },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        });

        // Strip markdown fences if present
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Sanitize against valid enums
        const classification = VALID_CLASSIFICATIONS.includes(parsed.classification)
          ? parsed.classification
          : 'not_real_estate';

        const roomType = (VALID_ROOM_TYPES as readonly string[]).includes(parsed.roomType)
          ? parsed.roomType
          : 'other';

        const suggestedStyle = (VALID_STYLES as readonly string[]).includes(parsed.suggestedStyle)
          ? parsed.suggestedStyle
          : 'modern';

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                classification,
                roomType,
                confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
                suggestedStyle,
                isEmpty: Boolean(parsed.isEmpty),
                rejectReason: parsed.rejectReason || null,
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
