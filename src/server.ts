import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerStageRoom,
  registerFloorPlan,
  registerClassifyRoom,
  registerOptimizeListing,
  registerSuggestStyle,
} from './tools/index.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'immostage-virtual-staging',
    version: '1.0.0',
  });

  registerStageRoom(server);
  registerFloorPlan(server);
  registerClassifyRoom(server);
  registerOptimizeListing(server);
  registerSuggestStyle(server);

  return server;
}
