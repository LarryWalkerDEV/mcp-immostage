import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  createStagingTask,
  waitForTaskCompletion,
  parseResultUrls,
  categorizeKieError,
} from '../lib/kie-client.js';
import { STAGING_PROMPT_TEMPLATE } from '../lib/prompts.js';

export function registerStageRoom(server: McpServer) {
  server.tool(
    'stage_room',
    'AI virtual staging - transform empty room photos into beautifully furnished spaces. Requires a publicly accessible image URL.',
    {
      image_url: z.string().url().describe('Public URL of the room image to stage'),
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
    async ({ image_url, style, room_type, quality }) => {
      const startTime = Date.now();
      try {
        const prompt = STAGING_PROMPT_TEMPLATE(style);
        const taskId = await createStagingTask(prompt, image_url, '3:2', quality);
        const status = await waitForTaskCompletion(taskId, 120000, 3000);

        if (status.data.state === 'fail') {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: 'Staging failed',
                  taskId,
                  failCode: status.data.failCode,
                  failMsg: status.data.failMsg,
                }),
              },
            ],
            isError: true,
          };
        }

        const resultUrls = parseResultUrls(status);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                taskId,
                resultUrls,
                style,
                roomType: room_type,
                quality,
                processingTimeMs: Date.now() - startTime,
              }),
            },
          ],
        };
      } catch (error) {
        const errorType = categorizeKieError(error as Error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: (error as Error).message,
                errorType,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
