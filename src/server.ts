import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';

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

// Configure OAuth provider
const oauthProvider = new ProxyOAuthServerProvider({
  endpoints: {
    // These would need to be replaced with actual Practera OAuth endpoints
    authorizationUrl: "https://auth.practera.com/oauth2/v1/authorize",
    tokenUrl: "https://auth.practera.com/oauth2/v1/token",
    revocationUrl: "https://auth.practera.com/oauth2/v1/revoke",
  },
  verifyAccessToken: async (token) => {
    // Implement token verification logic here
    // This is a placeholder implementation
    return {
      token,
      clientId: process.env.PRACTERA_CLIENT_ID || "client_id",
      scopes: ["api"],
    };
  },
  getClient: async (client_id) => {
    // Implement client retrieval logic
    // This is a placeholder implementation
    return {
      client_id,
      redirect_uris: [process.env.REDIRECT_URI || "https://localhost:3000/callback"],
    };
  }
});

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
