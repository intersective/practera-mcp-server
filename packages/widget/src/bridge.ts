/**
 * Standards-first MCP Apps bridge.
 *
 * New hosts communicate with JSON-RPC over postMessage. ChatGPT's
 * window.openai globals are used only as an initial-data compatibility path.
 */

export type McpToolResult = {
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
  _meta?: Record<string, unknown>;
};

export type BridgeListener = (result: McpToolResult) => void;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

const listeners = new Set<BridgeListener>();
const pendingRequests = new Map<number, PendingRequest>();
let nextRequestId = 1;
let initialized: Promise<void> | null = null;

function notify(method: string, params: Record<string, unknown> = {}): void {
  window.parent.postMessage({ jsonrpc: '2.0', method, params }, '*');
}

function request(method: string, params: Record<string, unknown>): Promise<unknown> {
  const id = nextRequestId++;
  window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*');
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
  });
}

export function onToolResult(listener: BridgeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(result: McpToolResult): void {
  for (const listener of listeners) listener(result);
}

export function initBridge(): Promise<void> {
  if (initialized) return initialized;

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message || message.jsonrpc !== '2.0') return;

    if (message.id !== undefined && pendingRequests.has(message.id)) {
      const pending = pendingRequests.get(message.id)!;
      pendingRequests.delete(message.id);
      if (message.error) pending.reject(message.error);
      else pending.resolve(message.result);
      return;
    }

    if (message.method === 'ui/notifications/tool-result') {
      publish(message.params ?? {});
    }
  }, { passive: true });

  const openai = (window as Window & {
    openai?: { toolOutput?: unknown; toolResponseMetadata?: Record<string, unknown> };
  }).openai;
  if (openai?.toolOutput) {
    publish({
      structuredContent: openai.toolOutput,
      _meta: openai.toolResponseMetadata,
    });
  }

  initialized = request('ui/initialize', {
    appInfo: { name: 'practera-project-briefs', version: '1.0.0' },
    appCapabilities: {},
    protocolVersion: '2026-01-26',
  }).then(() => {
    notify('ui/notifications/initialized');
  });

  return initialized;
}

export async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<McpToolResult> {
  await initBridge();
  return request('tools/call', { name, arguments: args }) as Promise<McpToolResult>;
}
