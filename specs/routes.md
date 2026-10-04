# App Routes

<!-- module: app/routes / type: routing / status: draft -->

## Overview

This module registers all HTTP routes for the Express application, including public informational pages, a health check endpoint, and the Model Context Protocol (MCP) endpoints for Server-Sent Events (SSE) and message handling. MCP routes (`/sse` and `/messages`) are protected by an optional bearer-token authentication middleware (`mcpAuth`). When the `MCP_SHARED_SECRET` environment variable is not set, the middleware allows all connections, enabling local development without credentials. Active SSE transports are tracked in an in-memory session store keyed by session ID, and cleaned up automatically when the client disconnects.

## Acceptance Criteria

- AC-1: `GET /` responds with HTTP 200 and the homepage HTML content.
- AC-2: `GET /docs` responds with HTTP 200 and the documentation HTML content.
- AC-3: `GET /health` responds with HTTP 200 and the plain text body `OK`.
- AC-4: `GET /sse` without a valid bearer token responds with HTTP 401 and `{ "error": "Unauthorized" }` when `MCP_SHARED_SECRET` is set.
- AC-5: `GET /sse` with a valid bearer token establishes an SSE connection and registers the transport in the session store.
- AC-6: When an SSE client disconnects, its transport is removed from the session store.
- AC-7: `POST /messages` without a valid bearer token responds with HTTP 401 and `{ "error": "Unauthorized" }` when `MCP_SHARED_SECRET` is set.
- AC-8: `POST /messages` with a valid bearer token and a known `sessionId` query parameter delegates to the matching transport's `handlePostMessage`.
- AC-9: `POST /messages` with a valid bearer token and an unknown or missing `sessionId` responds with HTTP 400 and the body `No transport found for sessionId`.
- AC-10: When `MCP_SHARED_SECRET` is not set, `GET /sse` and `POST /messages` are accessible without any `Authorization` header.
- AC-11: `GET /tools` returns HTTP 200 and `{ tools }` where each tool has `name`, `description`, and `inputSchema`, and `apikey` and `email` are omitted from that schema.
- AC-12: `POST /tools/call` with a known tool name and arguments runs that tool and returns its result. `express.json()` is applied only on this route.
- AC-13: `GET /tools` and `POST /tools/call` respond with HTTP 401 and `{ "error": "Unauthorized" }` when `MCP_SHARED_SECRET` is set and the bearer token does not match.
- AC-14: When `MCP_SHARED_SECRET` is not set, `GET /tools` and `POST /tools/call` are accessible without an `Authorization` header.
- AC-15: The SSE server allows CORS from the admin app origins (`ADMIN_APP_ORIGINS`, defaulting to `http://localhost:4400`, `https://admin.practera.local`, and `http://admin.practera.local`).

## Scenarios

### Scenario 1: Homepage renders successfully

**Steps:**
1. Send `GET /` to the running server with no headers.

**Expected Results:**
- Response status is `200`.
- Response body equals the rendered homepage HTML (non-empty HTML string).

---

### Scenario 2: Docs page renders successfully

**Steps:**
1. Send `GET /docs` to the running server with no headers.

**Expected Results:**
- Response status is `200`.
- Response body equals the rendered documentation HTML (non-empty HTML string).

---

### Scenario 3: Health check returns OK

**Steps:**
1. Send `GET /health` to the running server with no headers.

**Expected Results:**
- Response status is `200`.
- Response body is the plain text string `OK`.

---

### Scenario 4: SSE endpoint rejects unauthenticated request when secret is configured

**Steps:**
1. Set the environment variable `MCP_SHARED_SECRET` to a non-empty string (value redacted).
2. Send `GET /sse` with no `Authorization` header.

**Expected Results:**
- Response status is `401`.
- Response body is JSON: `{ "error": "Unauthorized" }`.
- No SSE connection is established.

---

### Scenario 5: SSE endpoint rejects request with wrong bearer token

**Steps:**
1. Set the environment variable `MCP_SHARED_SECRET` to a non-empty string (value redacted).
2. Send `GET /sse` with `Authorization: Bearer WRONG_TOKEN`.

**Expected Results:**
- Response status is `401`.
- Response body is JSON: `{ "error": "Unauthorized" }`.

---

### Scenario 6: SSE endpoint accepts request with correct bearer token

**Steps:**
1. Set the environment variable `MCP_SHARED_SECRET` to a non-empty string (value redacted).
2. Send `GET /sse` with `Authorization: Bearer <REDACTED_CORRECT_TOKEN>`.
3. Observe the response headers and body stream.

**Expected Results:**
- Response status is `200`.
- Response `Content-Type` header includes `text/event-stream`.
- A new session ID is registered in the in-memory transport store.

---

### Scenario 7: SSE transport is removed from store on client disconnect

**Steps:**
1. Establish a valid SSE connection as in Scenario 6 and record the assigned `sessionId`.
2. Close the client connection (simulate a `close` event on the response).
3. Attempt `POST /messages?sessionId=<recorded_sessionId>` with a valid bearer token.

**Expected Results:**
- Response status is `400`.
- Response body is `No transport found for sessionId`.

---

### Scenario 8: Messages endpoint routes to correct transport

**Steps:**
1. Establish a valid SSE connection as in Scenario 6 and record the assigned `sessionId`.
2. Send `POST /messages?sessionId=<recorded_sessionId>` with a valid bearer token and a well-formed MCP message body.

**Expected Results:**
- Response status is not `400` (transport was found).
- The transport's `handlePostMessage` is invoked with the request and response objects.

---

### Scenario 9: Messages endpoint returns 400 for unknown sessionId

**Steps:**
1. Set the environment variable `MCP_SHARED_SECRET` to a non-empty string (value redacted).
2. Send `POST /messages?sessionId=nonexistent-session-id` with `Authorization: Bearer <REDACTED_CORRECT_TOKEN>`.

**Expected Results:**
- Response status is `400`.
- Response body is the plain text string `No transport found for sessionId`.

---

### Scenario 10: MCP endpoints are open when no secret is configured

**Steps:**
1. Ensure `MCP_SHARED_SECRET` is unset (or empty) in the environment.
2. Send `GET /sse` with no `Authorization` header.
3. Send `POST /messages?sessionId=any-id` with no `Authorization` header.

**Expected Results:**
- `GET /sse` does not return `401`; the SSE handshake proceeds (status `200`).
- `POST /messages` does not return `401`; it proceeds to transport lookup (returns `400` only if session is unknown, not `401`).

---

### Scenario 11: Tool catalog omits the API key and calls a tool

**Steps:**
1. Leave `MCP_SHARED_SECRET` unset.
2. Send `GET /tools`.
3. Send `POST /tools/call` with a known tool name and arguments.

**Expected Results:**
- `GET /tools` is `200` and no tool schema contains `apikey` or `email`.
- `POST /tools/call` is `200` and returns the tool result.

---

### Scenario 12: Tool routes reject a bad bearer token

**Steps:**
1. Set `MCP_SHARED_SECRET`.
2. Send `GET /tools` and `POST /tools/call` with no bearer token, then with the matching bearer token.

**Expected Results:**
- The unauthenticated calls are `401` with `{ "error": "Unauthorized" }`.
- The matching bearer token is `200`.

## Security Notes

- The `MCP_SHARED_SECRET` environment variable value must never be logged, stored in source control, or reproduced in any output. All references in this spec are redacted.
- When `MCP_SHARED_SECRET` is not configured, all MCP endpoints are publicly accessible. This mode is intended for local development only and must not be used in production deployments.
- Authentication uses the HTTP `Authorization: Bearer <token>` scheme. Tokens are compared with strict equality; any mismatch results in a `401` response.
- The in-memory `transports` store is process-local and not shared across multiple server instances; horizontal scaling requires an external session store.

## Dependencies

- `express` — HTTP server framework providing `Request`, `Response`, `NextFunction`, and `Express` types.
- `@modelcontextprotocol/sdk/server/sse` — Provides `SSEServerTransport` for managing SSE-based MCP sessions.
- `@modelcontextprotocol/sdk/server/mcp` — Provides `McpServer` for connecting transports and handling MCP protocol messages.
- `./docs/html` — Exports `homepageHtml` and `docsHtml` strings rendered for the `/` and `/docs` routes respectively.
- `MCP_SHARED_SECRET` environment variable — Optional runtime secret controlling access to MCP endpoints.