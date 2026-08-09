import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = process.env.MCP_URL || 'http://localhost:3000/mcp';
const client = new Client({ name: 'practera-local-check', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(new URL(endpoint));

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name).sort(), [
    'fetch',
    'render_project_briefs',
    'search',
  ]);

  for (const tool of tools) {
    assert.equal(tool.annotations?.readOnlyHint, true, `${tool.name} must be read-only`);
    assert.equal(tool.annotations?.destructiveHint, false, `${tool.name} must be non-destructive`);
    assert.equal(tool.annotations?.openWorldHint, false, `${tool.name} must be closed-world`);
  }

  const searchResult = await client.callTool({
    name: 'search',
    arguments: { query: 'data analysis' },
  });
  assert.equal(searchResult.content.length, 1);
  const searchPayload = JSON.parse(searchResult.content[0].text);
  assert.ok(searchPayload.results.length > 0, 'search should return at least one result');
  assert.deepEqual(Object.keys(searchPayload.results[0]).sort(), ['id', 'title', 'url']);

  const firstId = searchPayload.results[0].id;
  const fetchResult = await client.callTool({
    name: 'fetch',
    arguments: { id: firstId },
  });
  const fetchPayload = JSON.parse(fetchResult.content[0].text);
  assert.equal(fetchPayload.id, firstId);
  assert.ok(fetchPayload.text.length > 0);

  const renderResult = await client.callTool({
    name: 'render_project_briefs',
    arguments: { ids: searchPayload.results.slice(0, 3).map((result) => result.id) },
  });
  assert.equal(renderResult.structuredContent.view, 'project_briefs');
  assert.ok(renderResult.structuredContent.briefs.length > 0);

  const { resources } = await client.listResources();
  const widget = resources.find((resource) => resource.uri === 'ui://practera/project-briefs-v1.html');
  assert.ok(widget, 'widget resource must be registered');

  const resourceResult = await client.readResource({ uri: widget.uri });
  const html = resourceResult.contents[0].text;
  assert.match(resourceResult.contents[0].mimeType, /text\/html;profile=mcp-app/);
  assert.match(html, /<script type="module">/);
  assert.ok(Buffer.byteLength(html) > 100_000, 'widget bundle should be inlined');
  assert.equal(
    (html.match(/<\/script>/gi) ?? []).length,
    1,
    'widget bundle must not contain an unescaped closing script tag'
  );

  console.log(JSON.stringify({
    endpoint,
    tools: tools.map((tool) => tool.name),
    searchResults: searchPayload.results.length,
    renderedBriefs: renderResult.structuredContent.briefs.length,
    widgetBytes: Buffer.byteLength(html),
  }, null, 2));
} finally {
  await client.close();
}
