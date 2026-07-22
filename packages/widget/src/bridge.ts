/**
 * MCP Apps Bridge — integrates with the OpenAI Apps SDK communication layer.
 *
 * Listens for tool results via:
 *   - Standard MCP Apps: postMessage with type 'ui/notifications/tool-result'
 *   - ChatGPT extension: window.openai.toolOutput (feature-detected)
 *
 * Calls tools via:
 *   - Standard MCP Apps: postMessage with type 'tools/call'
 *   - ChatGPT extension: window.openai.callTool (feature-detected)
 *
 * Follows the portability principle: build on the MCP Apps standard;
 * use window.openai only as a progressive enhancement.
 */

export type ToolResultPayload = {
  toolName: string;
  result: unknown;
};

export type ToolCallPayload = {
  toolName: string;
  params: Record<string, unknown>;
};

export type BridgeListener = (payload: ToolResultPayload) => void;

const listeners = new Map<string, BridgeListener[]>();

/**
 * Register a listener for tool results.
 */
export function onToolResult(toolName: string, listener: BridgeListener): () => void {
  if (!listeners.has(toolName)) listeners.set(toolName, []);
  listeners.get(toolName)!.push(listener);

  return () => {
    const arr = listeners.get(toolName) ?? [];
    const idx = arr.indexOf(listener);
    if (idx !== -1) arr.splice(idx, 1);
  };
}

/**
 * Call an MCP tool from within the widget.
 */
export async function callTool(toolName: string, params: Record<string, unknown>): Promise<void> {
  const payload: ToolCallPayload = { toolName, params };

  // ChatGPT-specific path (feature-detected)
  const openai = (window as unknown as { openai?: { callTool?: (name: string, params: unknown) => Promise<unknown> } }).openai;
  if (openai?.callTool) {
    await openai.callTool(toolName, params);
    return;
  }

  // Standard MCP Apps path
  window.parent.postMessage({
    type: 'tools/call',
    ...payload,
  }, '*');
}

/**
 * Initialise the bridge — wire up incoming messages.
 */
export function initBridge(): void {
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // Standard MCP Apps: ui/notifications/tool-result
    if (data.type === 'ui/notifications/tool-result') {
      const toolName = data.toolName as string;
      const result = data.result;
      const listenerArr = listeners.get(toolName) ?? [];
      for (const listener of listenerArr) {
        listener({ toolName, result });
      }
    }
  });

  // ChatGPT extension: window.openai.toolOutput (progressive)
  const openai = (window as unknown as { openai?: { toolOutput?: (cb: (name: string, output: unknown) => void) => void } }).openai;
  if (openai?.toolOutput) {
    openai.toolOutput((toolName, output) => {
      const listenerArr = listeners.get(toolName) ?? [];
      for (const listener of listenerArr) {
        listener({ toolName, result: output });
      }
    });
  }

  // Signal readiness to the host
  window.parent.postMessage({ type: 'ui/initialize' }, '*');
}
