import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { afterEach, describe, it } from 'node:test';
import express from 'express';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setupRoutes } from '../routes.js';

function appWithEcho() {
  const mcp = new McpServer({ name: 'test', version: '0.0.0' });
  mcp.tool(
    'echo_thing',
    'Echo a message',
    {
      apikey: z.string().optional().describe('secret'),
      email: z.string().optional(),
      message: z.string().describe('Text to echo'),
    },
    async (args: { message: string }) => ({
      content: [{ type: 'text' as const, text: args.message }],
    }),
  );
  const app = express();
  setupRoutes(app, mcp);
  return app;
}

async function listen(app: express.Express): Promise<{ server: Server; port: number }> {
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { server, port };
}

describe('tool HTTP routes', () => {
  const previous = process.env.MCP_SHARED_SECRET;

  afterEach(() => {
    if (previous === undefined) delete process.env.MCP_SHARED_SECRET;
    else process.env.MCP_SHARED_SECRET = previous;
  });

  it('lists tools without the API key and calls a tool', async () => {
    delete process.env.MCP_SHARED_SECRET;
    const { server, port } = await listen(appWithEcho());
    try {
      const listed = await fetch(`http://127.0.0.1:${port}/tools`);
      assert.equal(listed.status, 200);
      const body = await listed.json() as { tools: Array<{ name: string; inputSchema: { properties: Record<string, unknown>; required?: string[] } }> };
      const echo = body.tools.find((tool) => tool.name === 'echo_thing');
      assert.ok(echo);
      assert.equal('apikey' in echo.inputSchema.properties, false);
      assert.equal('email' in echo.inputSchema.properties, false);
      assert.deepEqual(echo.inputSchema.required, ['message']);

      const called = await fetch(`http://127.0.0.1:${port}/tools/call`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'echo_thing', arguments: { message: 'hello', apikey: 'stored-key' } }),
      });
      assert.equal(called.status, 200);
      const result = await called.json() as { content: Array<{ text: string }> };
      assert.equal(result.content[0].text, 'hello');
    } finally {
      server.close();
    }
  });

  it('rejects /tools and /tools/call when the shared secret is set', async () => {
    process.env.MCP_SHARED_SECRET = 'test-secret';
    const { server, port } = await listen(appWithEcho());
    try {
      const open = await fetch(`http://127.0.0.1:${port}/tools`);
      assert.equal(open.status, 401);
      const wrong = await fetch(`http://127.0.0.1:${port}/tools/call`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer wrong' },
        body: JSON.stringify({ name: 'echo_thing', arguments: { message: 'no' } }),
      });
      assert.equal(wrong.status, 401);
      const ok = await fetch(`http://127.0.0.1:${port}/tools`, {
        headers: { authorization: 'Bearer test-secret' },
      });
      assert.equal(ok.status, 200);
    } finally {
      server.close();
    }
  });
});
