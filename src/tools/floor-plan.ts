import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  createFloorPlanTask,
  waitForTaskCompletion,
  parseResultUrls,
  categorizeKieError,
} from '../lib/kie-client.js';
import { FLOOR_PLAN_PROMPT } from '../lib/prompts.js';

export function registerFloorPlan(server: McpServer) {
  server.tool(
    'beautify_floor_plan',
    'Transform 2D floor plans into stunning 3D isometric architectural renders. Requires a publicly accessible image URL.',
    {
      image_url: z.string().url().describe('Public URL of the floor plan image'),
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
    async ({ image_url, quality }) => {
      const startTime = Date.now();
      try {
        const taskId = await createFloorPlanTask(FLOOR_PLAN_PROMPT, image_url, quality);
        const status = await waitForTaskCompletion(taskId, 120000, 3000);

        if (status.data.state === 'fail') {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: 'Floor plan rendering failed',
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
