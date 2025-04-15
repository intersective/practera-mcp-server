import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';

import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import { z } from 'zod';
import express from "express";
import type { Request, Response } from "express";
import { GraphQLClient } from 'graphql-request';
import { PracteraAuth } from './auth.js';

// Configure dotenv
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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
  name: 'practera-mcp',
  version: '1.0.0',
  description: 'Designing work-based learning, project learning or other forms of career-connected learning? You can enhance your LLM\'s understanding of world-class experiential learning by connecting to Practera. Practera authors can evaluate and improve their designs in Practera by using our MCP integration.',
  capabilities: {
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
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
};

// Register project query tool
server.tool(
  'mcp_practera_get_project',
  'Get details about a Practera project',
  {
    apikey: z.string().optional().describe('API key for Practera authentication'),
    region: z.string().optional().describe('Practera region (usa, aus, euk, or stage)'),
  },
  async (params: { apikey?: string, region?: string }): Promise<ToolResult> => {
    try {
      const region = params.region || 'usa';
      // Create auth config
      const authConfig = { apikey: params.apikey || '' };
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
      } as ToolResult;
    } catch (error) {
     //console.error('Error fetching project:');
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching project: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      } as ToolResult;
    }
  }
);

// Register assessment query tool
server.tool(
  'mcp_practera_get_assessment',
  'Get details about a Practera assessment. Note that assessmentId is the ID of the task, not the ID of the activity.',
  {
    apikey: z.string().optional().describe('API key for Practera authentication'),
    region: z.string().optional().describe('Practera region (usa, aus, euk, or stage)'),
    assessmentId: z.string().describe('ID of the assessment to fetch')
  },
  async (params: { apikey?: string, region?: string, assessmentId: string }): Promise<ToolResult> => {
    try {
      const region = params.region || 'usa';
      // Create auth config
      const authConfig = { apikey: params.apikey || '' };
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
      
      const variables = { id: parseInt(params.assessmentId)};
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
        ],
        isError: true
      } as ToolResult;
    }
  }
);

// Apply CORS middleware BEFORE routes
app.use(cors({ origin: '*' })); // Allow all origins for simplicity, adjust for production

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

// // Export the server for AWS Lambda
// export const handler = serverless(app);


const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 80 : 3000);
app.listen(PORT, () => {
  console.log(`MCP Server with Express listening on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Message endpoint: http://localhost:${PORT}/messages`);
});
