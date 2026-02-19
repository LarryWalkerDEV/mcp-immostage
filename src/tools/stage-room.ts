import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  createStagingTask,
  waitForTaskCompletion,
  parseResultUrls,
  categorizeKieError,
} from '../lib/kie-client.js';
import { uploadBase64Image } from '../lib/image-upload.js';
import { STAGING_PROMPT_TEMPLATE } from '../lib/prompts.js';

export function registerStageRoom(server: McpServer) {
  server.tool(
    'stage_room',
    'AI virtual staging - transform empty room photos into beautifully furnished spaces. Provide either a public image URL or a base64-encoded image.',
    {
      image_url: z.string().url().optional().describe('Public URL of the room image to stage'),
      image_base64: z.string().optional().describe('Base64-encoded image data (with or without data URI prefix). Use this when the user pastes/uploads an image directly.'),
      style: z
        .enum(['modern', 'scandinavian', 'classic', 'minimal', 'luxury'])
        .describe('Interior design style'),
      room_type: z
        .enum(['living_room', 'bedroom', 'kitchen', 'bathroom', 'office', 'other'])
        .describe('Type of room'),
      quality: z
        .enum(['medium', 'high'])
        .default('medium')
        .describe('Output quality. medium=faster/cheaper, high=better detail'),
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ image_url, image_base64, style, room_type, quality }) => {
      const startTime = Date.now();
      try {
        // Resolve image URL — either provided directly or uploaded from base64
        let resolvedUrl: string;
        if (image_url) {
          resolvedUrl = image_url;
        } else if (image_base64) {
          resolvedUrl = await uploadBase64Image(image_base64);
        } else {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Provide either image_url or image_base64' }) }],
            isError: true,
          };
        }

        const prompt = STAGING_PROMPT_TEMPLATE(style);
        const taskId = await createStagingTask(prompt, resolvedUrl, '3:2', quality);
        const status = await waitForTaskCompletion(taskId, 120000, 3000);

        if (status.data.state === 'fail') {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Staging failed',
                taskId,
                failCode: status.data.failCode,
                failMsg: status.data.failMsg,
              }),
            }],
            isError: true,
          };
        }

        const resultUrls = parseResultUrls(status);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              taskId,
              resultUrls,
              style,
              roomType: room_type,
              quality,
              processingTimeMs: Date.now() - startTime,
            }),
          }],
        };
      } catch (error) {
        const errorType = categorizeKieError(error as Error);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: (error as Error).message, errorType }),
          }],
          isError: true,
        };
      }
    }
  );
}
