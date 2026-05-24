/**
 * stdio transport entry point for the Practera MCP server.
 *
 * Use this when running the server via Cursor's MCP stdio mode — Cursor
 * spawns this process directly and communicates over stdin/stdout.
 *
 * For SSE/HTTP transport (remote or shared), use server.ts instead.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { registerAllTools } from './tools/index.js';
import {
  registerProjectPrompts,
  registerAssessmentPrompts,
  registerProjectBriefPrompts
} from './prompts/index.js';
import { registerPracteraResources } from './resources/practera-resources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const server = new McpServer({
  name: 'practera-mcp',
  version: '1.0.0',
  description: 'Practera MCP server — access Practera GraphQL API from Cursor agents.',
  capabilities: {
    prompts: {},
    tools: {},
    resources: {},
  }
});

registerAllTools(server);
registerProjectPrompts(server);
registerAssessmentPrompts(server);
registerProjectBriefPrompts(server);
registerPracteraResources(server);

const transport = new StdioServerTransport();
await server.connect(transport);
