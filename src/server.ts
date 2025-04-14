import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';

import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';
import express from "express";
import type { Request, Response } from "express";

import serverless from 'serverless-http';
import { PracteraAuth } from './auth.js';
import { createLambdaStreamHandler } from './lambda-native-stream.js';
import { SessionStore } from './session-store.js';

// Environment detection
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

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

// Store the server instance in the global scope to make it accessible to the Lambda streaming handler
(global as any).mcpServerInstance = server;

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

// Add CORS headers for function URLs
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports: {[sessionId: string]: SSEServerTransport } = {};

// Handle root path requests when using function URL
app.get("/", async (req: Request, res: Response) => {
  console.log("Root path handler called");
  console.log("User Agent:", req.headers['user-agent']);
  console.log("Request headers:", req.headers);

  // For Lambda function URLs, the root path should be treated as /sse
  if (isLambda) {
    //console.log("Using Lambda streaming transport");
    
    // Explicitly set SSE headers on the response before creating transport
    if (!req.headers.accept || req.headers.accept.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
    }
    
    // First, send an informational message to help with debugging
    res.write(`data: ${JSON.stringify({
      type: "info",
      message: "SSE connection established through Lambda Function URL. SessionId will be in the next message.",
      lambdaInfo: {
        environment: "Lambda", 
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        region: process.env.AWS_REGION,
        functionUrl: "https://uvfiftbh3vyz7oeouco22cx6ji0cyays.lambda-url.us-east-1.on.aws/"
      }
    })}\n\n`);
    
    // Create a streaming transport for the response
    const transport = new SSEServerTransport('/messages', res);
    
    // Send another info message with the session ID for easy reference
    res.write(`data: ${JSON.stringify({
      type: "sessionInfo",
      sessionId: transport.sessionId,
      message: "Use this sessionId for sending messages to this connection",
      messageEndpoint: "/messages?sessionId=" + transport.sessionId
    })}\n\n`);
    
    // Store the transport for message handling
    transports[transport.sessionId] = transport;
    
    // Store session info in DynamoDB
    if (isLambda) {
      SessionStore.saveSession(transport.sessionId, {
        activeConnection: true,
        clientInfo: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        }
      }).catch(err => console.error('Failed to save session data:', err));
    }
    
    // Clean up on connection close
    res.on("close", () => {
      console.log(`Client disconnected: ${transport.sessionId}`);
      delete transports[transport.sessionId];
      
      // Update session state in DynamoDB
      if (isLambda) {
        SessionStore.closeSession(transport.sessionId)
          .catch(err => console.error('Failed to close session in DynamoDB:', err));
      }
    });
    
    // Connect the transport to the MCP server
    try {
      console.log(`Connection established: ${transport.sessionId}`);
      await server.connect(transport);
    } catch (err) {
      console.error("Error connecting transport:", err);
    }
  } else {
    // Redirect to /sse in non-Lambda environments
    console.log("Redirecting to /sse");
    res.redirect('/sse');
  }
});

// Standard SSE endpoint for MCP
app.get("/sse", async (req: Request, res: Response) => {
  console.log("SSE endpoint called");
  console.log("User Agent:", req.headers['user-agent']);
  console.log("Request headers:", req.headers);
  
  // Explicitly set SSE headers on the response before creating transport
  if (!req.headers.accept || req.headers.accept.includes('text/event-stream')) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
  }
  
  // First, send an informational message to help with debugging
  res.write(`data: ${JSON.stringify({
    type: "info",
    message: "SSE connection established. SessionId will be in the next message.",
    lambdaInfo: isLambda ? {
      environment: "Lambda", 
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      region: process.env.AWS_REGION,
      functionUrl: "https://uvfiftbh3vyz7oeouco22cx6ji0cyays.lambda-url.us-east-1.on.aws/"
    } : { environment: "Local development" }
  })}\n\n`);
  
  // Use the appropriate transport based on the environment
  const transport = new SSEServerTransport('/messages', res);
  
  // Send another info message with the session ID for easy reference
  res.write(`data: ${JSON.stringify({
    type: "sessionInfo",
    sessionId: transport.sessionId,
    message: "Use this sessionId for sending messages to this connection",
    messageEndpoint: "/messages?sessionId=" + transport.sessionId
  })}\n\n`);
  
  // Store the transport for message handling
  transports[transport.sessionId] = transport;
  
  // Store session info in DynamoDB
  if (isLambda) {
    SessionStore.saveSession(transport.sessionId, {
      activeConnection: true,
      clientInfo: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      }
    }).catch(err => console.error('Failed to save session data:', err));
  }
  
  // Clean up on connection close
  res.on("close", () => {
    console.log(`Client disconnected: ${transport.sessionId}`);
    delete transports[transport.sessionId];
    
    // Update session state in DynamoDB
    if (isLambda) {
      SessionStore.closeSession(transport.sessionId)
        .catch(err => console.error('Failed to close session in DynamoDB:', err));
    }
  });
  
  // Connect the transport to the MCP server
  try {
    console.log(`Connection established: ${transport.sessionId}`);
    await server.connect(transport);
  } catch (err) {
    console.error("Error connecting transport:", err);
  }
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  
  // First check local transports
  let transport = transports[sessionId];
  
  // If not found and in Lambda, check DynamoDB
  if (!transport && isLambda) {
    try {
      console.log(`Transport not found in memory for session ${sessionId}, checking DynamoDB...`);
      const sessionData = await SessionStore.getSession(sessionId);
      
      if (sessionData && sessionData.activeConnection) {
        console.log(`Session ${sessionId} found in DynamoDB, but connection is in another Lambda instance`);
        console.log('Creating a fixed response for disconnected session...');
        
        // We should just return an appropriate HTTP response - 202 Accepted
        // This acknowledges the message was received but won't actually process it
        res.status(202).end('Accepted');
        
        // Update the DynamoDB record to indicate client should reconnect
        await SessionStore.saveSession(sessionId, { 
          activeConnection: false,
          reconnectNeeded: true
        });
        
        return;
      }
    } catch (dbError) {
      console.error('Error checking DynamoDB for session:', dbError);
    }
  }
  
  if (transport) {
    try {
      // Handle the message according to MCP protocol
      // This will return 202 Accepted on success as per SSEServerTransport implementation
      await transport.handlePostMessage(req, res);
      
      // Update session activity in DynamoDB
      if (isLambda) {
        SessionStore.saveSession(sessionId, { 
          activeConnection: true,
          lastActivityAt: Math.floor(Date.now() / 1000)
        }).catch(err => console.error('Failed to update session activity:', err));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      // Let the error response be handled by transport.handlePostMessage
    }
  } else {
    // Standard error when transport not found
    res.status(400).end('No transport found for sessionId');
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Create the Express app handler
const expressHandler = serverless(app);

// Create the Lambda streaming handler
const lambdaHandler = isLambda ? createLambdaStreamHandler(expressHandler) : expressHandler;

// Export the handler for AWS Lambda
export const handler = lambdaHandler;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Practera MCP Server running on http://localhost:${PORT}/sse`);
  });
} 