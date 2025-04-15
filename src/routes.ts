import { Express, Request, Response } from 'express';
import { homepageHtml, docsHtml } from './docs/html.js';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Central store for transports
const transports: {[sessionId: string]: SSEServerTransport} = {};

export const setupRoutes = (app: Express, server: McpServer) => {
  // Root endpoint - welcome page
  app.get('/', (req: Request, res: Response) => {
    res.status(200).send(homepageHtml);
  });

  // Documentation endpoint
  app.get('/docs', (req: Request, res: Response) => {
    res.status(200).send(docsHtml);
  });

  // SSE endpoint for MCP
  app.get("/sse", async (_: Request, res: Response) => {
    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;
    res.on("close", () => {
      delete transports[transport.sessionId];
    });
    await server.connect(transport);
  });

  // Message endpoint for MCP
  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send('No transport found for sessionId');
    }
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
  });
}; 