import express, { Express } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';
import { setupRoutes } from './routes.js';
import {
  registerProjectPrompts,
  registerAssessmentPrompts,
  registerProjectBriefPrompts,
} from './prompts/index.js';
import { registerPracteraResources } from './resources/practera-resources.js';

export function createApp(): Express {
  const server = new McpServer(
    {
      name: 'practera-mcp',
      version: '1.0.0',
      description:
        'Designing work-based learning, project learning or other forms of career-connected learning? You can enhance your LLM\'s understanding of world-class experiential learning by connecting to Practera. Search for project briefs by skill, analyze existing projects, and get detailed assessment information to create engaging experiential learning experiences.',
    },
    {
      capabilities: {
        prompts: {},
        tools: {},
        resources: {},
      },
    }
  );

  registerAllTools(server);
  registerProjectPrompts(server);
  registerAssessmentPrompts(server);
  registerProjectBriefPrompts(server);
  registerPracteraResources(server);

  const app = express();
  setupRoutes(app, server);
  return app;
}
