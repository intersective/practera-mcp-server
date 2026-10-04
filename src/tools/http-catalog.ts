import type { ZodTypeAny } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

type RegisteredTool = {
  description?: string;
  inputSchema?: ZodTypeAny;
  enabled?: boolean;
};

type ToolServer = McpServer & {
  _registeredTools: Record<string, RegisteredTool>;
  validateToolInput: (tool: RegisteredTool, args: unknown, name: string) => Promise<unknown>;
  executeToolHandler: (tool: RegisteredTool, args: unknown, extra: Record<string, unknown>) => Promise<unknown>;
};

const SECRET_FIELDS = new Set(['apikey', 'email']);

function typeName(schema: { _def?: { typeName?: string } } | undefined): string {
  return schema?._def?.typeName ?? '';
}

function unwrap(schema: any): any {
  const name = typeName(schema);
  if (name === 'ZodOptional' || name === 'ZodNullable' || name === 'ZodDefault') {
    return unwrap(schema._def.innerType);
  }
  return schema;
}

function fieldSchema(schema: any): Record<string, unknown> {
  const description = schema?.description ? { description: schema.description } : {};
  const name = typeName(schema);
  if (name === 'ZodString') return { type: 'string', ...description };
  if (name === 'ZodNumber') return { type: 'number', ...description };
  if (name === 'ZodBoolean') return { type: 'boolean', ...description };
  if (name === 'ZodEnum') return { type: 'string', enum: schema._def.values, ...description };
  if (name === 'ZodArray') return { type: 'array', items: fieldSchema(unwrap(schema._def.type)), ...description };
  if (name === 'ZodObject') return jsonSchemaFromZod(schema);
  return description;
}

export function jsonSchemaFromZod(schema: any): Record<string, unknown> {
  if (typeName(schema) !== 'ZodObject') return { type: 'object', properties: {} };
  const shape = typeof schema.shape === 'function' ? schema.shape() : schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape as Record<string, any>)) {
    if (SECRET_FIELDS.has(key)) continue;
    properties[key] = fieldSchema(unwrap(value));
    const name = typeName(value);
    if (name !== 'ZodOptional' && name !== 'ZodDefault') required.push(key);
  }
  return { type: 'object', properties, ...(required.length ? { required } : {}) };
}

export function listPublicTools(server: McpServer) {
  const tools = (server as ToolServer)._registeredTools ?? {};
  return Object.entries(tools)
    .filter(([, tool]) => tool.enabled !== false)
    .map(([name, tool]) => ({
      name,
      description: tool.description ?? '',
      inputSchema: jsonSchemaFromZod(tool.inputSchema),
    }));
}

export async function callRegisteredTool(server: McpServer, name: string, args: unknown) {
  const tools = (server as ToolServer)._registeredTools ?? {};
  const tool = tools[name];
  if (!tool || tool.enabled === false) {
    throw new Error(`Unknown tool ${name}`);
  }
  const parsed = await (server as ToolServer).validateToolInput(tool, args ?? {}, name);
  return (server as ToolServer).executeToolHandler(tool, parsed, {});
}
