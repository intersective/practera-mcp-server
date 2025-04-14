import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import getRawBody from "raw-body";

import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';
import express from "express";
import type { Request, Response } from "express";

import serverless from 'serverless-http';
import { PracteraAuth } from './auth.js';

// Region-specific API endpoints
const PRACTERA_ENDPOINTS: Record<string, string> = {
  usa: 'https://core-graphql-api.usa.practera.com/',
  aus: 'https://core-graphql-api.aus.practera.com/',
  euk: 'https://core-graphql-api.euk.practera.com/',
  // Stage endpoint for development
  stage: 'https://core-graphql-api.p2-stage.practera.com/'
};

// Create server instance
const server = new McpServer({
  name: 'practera-api',
  version: '1.0.0',
  capabilities: {
    resources: {},
    tools: {}
  }
});

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

// Initialize Express app for SSE transport
const app = express();

// // Setup OAuth routes
// app.use('/oauth', mcpAuthRouter({
//   provider: oauthProvider,
//   issuerUrl: new URL(process.env.ISSUER_URL || "https://auth.practera.com"),
//   baseUrl: new URL(process.env.BASE_URL || "https://practera-mcp.example.com"),
//   serviceDocumentationUrl: new URL("https://help.practera.com/"),
// }));

// Helper function to create GraphQL client with support for both API key and OAuth
function createGraphQLClient(authConfig: any, region: string) {
  const endpoint = PRACTERA_ENDPOINTS[region.toLowerCase()] || PRACTERA_ENDPOINTS.stage;

  // Create auth helper - handles both API key and OAuth token
  const auth = authConfig instanceof PracteraAuth 
    ? authConfig 
    : (typeof authConfig === 'string' 
      ? new PracteraAuth({ apikey: authConfig, appkey: '', accessToken: '' }) 
      : new PracteraAuth(authConfig));
  
  // Cast headers to unknown first to avoid type issues with GraphQLClient
  return new GraphQLClient(endpoint, {
    headers: auth.getHeaders() as unknown as Record<string, string>
  });
}

// Define types for simplified tool registration
type ToolResult = {
  content: Array<{type: string, text: string}>;
  isError?: boolean;
};

// Register project query tool
server.tool(
  'mcp_practera_get_project',
  'Get details about a Practera project',
  {
    apikey: z.string().optional().describe('API key for Practera authentication'),
    region: z.string().describe('Practera region (usa, aus, euk, or stage)'),
  },
  async ({ apikey, region }) => {
    try {
      // Create auth config
      const authConfig = { apikey };
      //console.log('authConfig:', authConfig);
      //  console.log('region:', region);
      const client = createGraphQLClient(authConfig, region);
      const query = `
        query project {
          project {
            id
            name
            milestones {
              id
              name
              description
              isLocked
              activities {
                id
                name
                description
                instructions
                isLocked
                leadImage
                tasks {
                  id
                  name 
                  type 
                  isLocked 
                  isTeam 
                  deadline 
                  contextId 
                  assessmentType
                }
              }
            }
          }
        }
      `;
      
      const variables = { };
      const data = await client.request(query, variables);
      //console.log('data:', data);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    } catch (error) {
     //console.error('Error fetching project:');
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching project: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Register assessment query tool
server.tool(
  'mcp_practera_get_assessment',
  'Get details about a Practera assessment. Note that assessmentId is the ID of the task, not the ID of the activity.',
  {
    apikey: z.string().optional().describe('API key for Practera authentication'),
    region: z.string().describe('Practera region (usa, aus, euk, or stage)'),
    assessmentId: z.string().describe('ID of the assessment to fetch')
  },
  async ({ apikey, region, assessmentId }) => {
    try {
      // Create auth config
      const authConfig = { apikey };
      const client = createGraphQLClient(authConfig, region);
      //console.log('assessmentId:', assessmentId);
      const query = `
        query GetAssessment($id: Int!) {
          assessment(id: $id, reviewer: false) {
            id
            name
            description
            type
            dueDate
            isTeam
            pulseCheck
            groups {
              name
              description
              questions {
                id
                name
                description
                type
                isRequired
                hasComment
                audience
                fileType
                choices {
                  id
                  name
                  description
                  explanation
                }
              }
            }
          }
        }
      `;
      
      const variables = { id: parseInt(assessmentId)};
      const data = await client.request(query, variables);
      //console.error('data:', data);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    } catch (error) {
      //console.error('Error fetching assessment:', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching assessment: ${error instanceof Error ? error.message : String(error)}`
          }
        ]
      };
    }
  }
);

// Register content query tool

// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports: {[sessionId: string]: SSEServerTransport} = {};

// SSE endpoint for MCP
app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    // const body = await getRawBody(req, {
    //   length: req.headers['content-length'],
    //   encoding: 'utf8'
    // });
    // console.log('body:', body);
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Export the server for AWS Lambda
export const handler = serverless(app);

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Practera MCP Server running on http://localhost:${PORT}/sse`);
  });
} 