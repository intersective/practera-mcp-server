import { Express, Request, Response, NextFunction } from 'express';
import { homepageHtml, docsHtml } from './docs/html.js';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createChatGptServer } from './chatgpt/server.js';
import { loadWidgetHtml } from './chatgpt/widget-resource.js';
import { projectBriefService } from './libs/project-brief-service.js';

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
  app.options('/mcp', (_req: Request, res: Response) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, mcp-session-id, authorization',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    });
    res.status(204).end();
  });

  app.all('/mcp', mcpAuth, async (req: Request, res: Response) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    });

    const chatGptServer = createChatGptServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      void transport.close();
      void chatGptServer.close();
    });

    try {
      await chatGptServer.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling /mcp request:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

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
    res.status(200).json({ status: 'ok', mcp: '/mcp' });
  });

  app.get('/briefs/:id', async (req: Request, res: Response) => {
    const brief = await projectBriefService.getBriefById(req.params.id);
    if (!brief) {
      res.status(404).send('Project brief not found');
      return;
    }

    res.status(200).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(brief.project_title)} · Practera</title></head>
<body style="font-family:system-ui;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.55">
<main><p>Practera project brief</p><h1>${escapeHtml(brief.project_title)}</h1>
<p><strong>${escapeHtml(brief.industry)}</strong> · ${escapeHtml(brief.project_type)} · ${brief.duration_weeks} weeks</p>
<h2>Challenge</h2><p>${escapeHtml(brief.problem_statement)}</p>
<h2>Scope</h2><p>${escapeHtml(brief.project_scope)}</p>
<h2>Deliverables</h2><ul>${brief.deliverables.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
</main></body></html>`);
  });

  if (process.env.NODE_ENV !== 'production') {
    app.get('/dev/widget-frame', async (_req: Request, res: Response) => {
      res.status(200).type('html').send(await loadWidgetHtml());
    });

    app.get('/dev/widget-preview', async (req: Request, res: Response) => {
      const query = typeof req.query.q === 'string' ? req.query.q : 'data analysis';
      const matches = await projectBriefService.searchBySkill(query, 3);
      const structuredContent = {
        view: 'project_briefs',
        briefs: matches.map((brief) => {
          const id = projectBriefService.getBriefId(brief);
          return {
            id,
            title: brief.project_title,
            url: `/briefs/${encodeURIComponent(id)}`,
            industry: brief.industry,
            projectType: brief.project_type,
            durationWeeks: brief.duration_weeks,
            technicalSkills: brief.technical_skills_required,
            professionalSkills: brief.professional_skills_required,
            deliverables: brief.deliverables,
          };
        }),
      };
      const safePayload = JSON.stringify(structuredContent).replace(/</g, '\\u003c');

      res.status(200).type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Practera widget preview</title>
<style>html,body{margin:0;background:#eef2f7}iframe{display:block;width:100%;height:100vh;border:0}</style></head>
<body><iframe id="widget" title="Practera widget preview" src="/dev/widget-frame"></iframe>
<script>
const frame = document.getElementById('widget');
const toolResult = { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { structuredContent: ${safePayload} } };
window.addEventListener('message', (event) => {
  if (event.source !== frame.contentWindow || event.data?.jsonrpc !== '2.0') return;
  if (event.data.method === 'ui/initialize' && event.data.id !== undefined) {
    frame.contentWindow.postMessage({
      jsonrpc: '2.0',
      id: event.data.id,
      result: { protocolVersion: '2026-01-26', hostInfo: { name: 'local-preview', version: '1.0.0' }, hostCapabilities: {} }
    }, '*');
    frame.contentWindow.postMessage(toolResult, '*');
  }
});
</script></body></html>`);
    });
  }

  app.get('/.well-known/openai-apps-challenge', (_req: Request, res: Response) => {
    const token = process.env.OPENAI_APPS_CHALLENGE;
    if (!token) {
      res.status(404).send('Not configured');
      return;
    }
    res.status(200).type('text/plain').send(token);
  });
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);
}
