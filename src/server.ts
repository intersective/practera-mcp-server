import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// ProxyOAuthServerProvider is scaffolded but not yet wired — see comment below
// import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';

import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import express from "express";

// Import refactored modules
import { registerAllTools } from './tools/index.js';
import { setupRoutes } from './routes.js';
import { 
  registerProjectPrompts, 
  registerAssessmentPrompts, 
  registerProjectBriefPrompts 
} from './prompts/index.js';
import { registerPracteraResources } from './resources/practera-resources.js';

// Configure dotenv
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Create server instance
const server = new McpServer(
  {
    name: 'practera-mcp',
    version: '1.0.0',
    description: 'Designing work-based learning, project learning or other forms of career-connected learning? You can enhance your LLM\'s understanding of world-class experiential learning by connecting to Practera. Search for project briefs by skill, analyze existing projects, and get detailed assessment information to create engaging experiential learning experiences.',
  },
  {
    capabilities: {
      prompts: {},
      tools: {},
      resources: {},
    },
  }
);

// OAuth provider scaffolded but NOT wired into any route — placeholder only.
// Do not use until Practera OAuth endpoints are available and the provider
// is passed to setupRoutes() or applied as middleware.
// const oauthProvider = new ProxyOAuthServerProvider({ ... });

// Register tools with the server
registerAllTools(server);

// Register prompts with the server
registerProjectPrompts(server);
registerAssessmentPrompts(server);
registerProjectBriefPrompts(server);

// Register resources with the server
registerPracteraResources(server);

// Initialize Express app for SSE transport
const app = express();

// Apply CORS middleware BEFORE routes
// app.use(cors({ origin: '*' })); // Allow all origins for simplicity, adjust for production

// Setup routes
setupRoutes(app, server);

// Start the server
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 80 : 3000);
app.listen(PORT, () => {
  console.log(`MCP Server with Express listening on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Message endpoint: http://localhost:${PORT}/messages`);
});
