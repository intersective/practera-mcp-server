import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * `McpServer.tool()` overloads infer a Zod schema type that TypeScript
 * reports as excessively deep. Compiling every tool in one program
 * exhausts the heap. This wrapper keeps the same runtime call.
 */
type LooseTool = (
  name: string,
  description: string,
  schema: object,
  handler: (params: any, extra?: any) => any,
) => void;

type LoosePrompt = (
  name: string,
  description: string,
  schema: object,
  handler: (params: any, extra?: any) => any,
) => void;

export function registerPrompt(
  server: McpServer,
  name: string,
  description: string,
  schema: object,
  handler: (params: any, extra?: any) => any,
): void {
  const prompt = server.prompt.bind(server) as unknown as LoosePrompt;
  prompt(name, description, schema, handler);
}

export function registerTool(
  server: McpServer,
  name: string,
  description: string,
  schema: object,
  handler: (params: any, extra?: any) => any,
): void {
  const tool = server.tool.bind(server) as unknown as LooseTool;
  tool(name, description, schema, handler);
}
