import { Express, Request, Response, NextFunction } from 'express';
import express from 'express';
import { homepageHtml, docsHtml } from './docs/html.js';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callRegisteredTool, listPublicTools } from './tools/http-catalog.js';

// Central store for transports
const transports: {[sessionId: string]: SSEServerTransport} = {};

/**
 * Middleware that requires a valid MCP_SHARED_SECRET bearer token.
 * If MCP_SHARED_SECRET is not set, access is allowed (local dev mode).
 * This guards /sse, /messages, and /mcp against unauthenticated access in production.
 */
function mcpAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.MCP_SHARED_SECRET;
  if (!secret) {
    // No secret configured — allow all connections (local dev / SSE stdio mode).
    return next();
  }
  const authHeader = (req.headers['authorization'] as string | undefined) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token === secret) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

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
  app.get("/sse", mcpAuth, async (_: Request, res: Response) => {
    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;
    res.on("close", () => {
      delete transports[transport.sessionId];
    });
    await server.connect(transport);
  });

  // Message endpoint for MCP
  app.post("/messages", mcpAuth, async (req: Request, res: Response) => {
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

  app.get('/tools', mcpAuth, (_req: Request, res: Response) => {
    res.status(200).json({ tools: listPublicTools(server) });
  });

  app.post('/tools/call', mcpAuth, express.json(), async (req: Request, res: Response) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name : '';
      const result = await callRegisteredTool(server, name, req.body?.arguments ?? {});
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}; 