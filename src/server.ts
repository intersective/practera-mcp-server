import dotenv from 'dotenv';
import path from 'node:path';
import { createApp } from './app.js';

// Configure dotenv
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = createApp();

// Start the server
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 80 : 3000);
app.listen(PORT, () => {
  console.log(`MCP Server with Express listening on http://localhost:${PORT}`);
  console.log(`ChatGPT Streamable HTTP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Message endpoint: http://localhost:${PORT}/messages`);
});
