# Practera MCP Server Bootstrap

<!-- module: app/server / type: server-entrypoint / status: draft -->

## Overview

This module is the main entry point for the Practera MCP (Model Context Protocol) server. It instantiates an `McpServer` named `practera-mcp` (version 1.0.0) with capabilities for prompts, tools, and resources. A proxy OAuth provider is configured to delegate authentication to Practera's OAuth 2.0 endpoints. All tools, prompts, and resources are registered against the server instance before an Express HTTP server is started to handle SSE and message transport. The listening port defaults to `80` in production and `3000` in all other environments, overridable via the `PORT` environment variable.

## Acceptance Criteria

- AC1: The MCP server instance is created with name `practera-mcp`, version `1.0.0`, and capabilities `prompts`, `tools`, and `resources` all declared.
- AC2: The OAuth provider is configured with authorization, token, and revocation URLs pointing to `https://auth.practera.com/oauth2/v1/*` endpoints.
- AC3: `verifyAccessToken` returns an object containing the submitted token, a `clientId` sourced from `PRACTERA_CLIENT_ID` env var (falling back to a placeholder), and scopes `["api"]`.
- AC4: `getClient` returns an object containing the provided `client_id` and a `redirect_uris` array sourced from `REDIRECT_URI` env var (falling back to `https://localhost:3000/callback`).
- AC5: All tool registrations (`registerAllTools`), prompt registrations (`registerProjectPrompts`, `registerAssessmentPrompts`, `registerProjectBriefPrompts`), and resource registrations (`registerPracteraResources`) are invoked before the HTTP server starts.
- AC6: The Express app starts and listens on the resolved port; startup log lines confirm the base URL, `/sse` endpoint, and `/messages` endpoint.
- AC7: Environment variables are loaded from a `.env` file resolved relative to `process.cwd()` before any configuration is read.
- AC8: Secret-like environment variable values (`PRACTERA_CLIENT_ID`, `REDIRECT_URI`, `PORT`) are never hard-coded in source beyond their fallback placeholders.

## Scenarios

### Scenario 1: Server starts successfully in development mode

**Steps:**
1. Set `NODE_ENV` to any value other than `production` and leave `PORT` unset.
2. Launch the server process (`node dist/server.js` or equivalent).
3. Observe standard output.

**Expected Results:**
- Console output contains `MCP Server with Express listening on http://localhost:3000`.
- Console output contains `SSE endpoint: http://localhost:3000/sse`.
- Console output contains `Message endpoint: http://localhost:3000/messages`.
- The process does not exit with a non-zero code.

### Scenario 2: Server starts on port 80 in production mode

**Steps:**
1. Set `NODE_ENV=production` and leave `PORT` unset.
2. Launch the server process.
3. Observe standard output.

**Expected Results:**
- Console output contains `http://localhost:80`.
- The process binds to port `80`.

### Scenario 3: PORT environment variable overrides default

**Steps:**
1. Set `PORT=8080` and `NODE_ENV=development`.
2. Launch the server process.
3. Observe standard output.

**Expected Results:**
- Console output contains `http://localhost:8080`.
- The process does not bind to port `3000` or `80`.

### Scenario 4: OAuth token verification returns expected shape

**Steps:**
1. Set `PRACTERA_CLIENT_ID=test-client` in the environment.
2. Invoke `verifyAccessToken` with an arbitrary token string `"sample-token"`.
3. Inspect the resolved return value.

**Expected Results:**
- Returned object has `token` equal to `"sample-token"`.
- Returned object has `clientId` equal to `"test-client"`.
- Returned object has `scopes` equal to `["api"]`.

### Scenario 5: OAuth token verification falls back when PRACTERA_CLIENT_ID is absent

**Steps:**
1. Ensure `PRACTERA_CLIENT_ID` is not set in the environment.
2. Invoke `verifyAccessToken` with any token string.
3. Inspect the resolved return value.

**Expected Results:**
- Returned object has `clientId` equal to `"client_id"` (the fallback placeholder).

### Scenario 6: getClient returns redirect URI from environment

**Steps:**
1. Set `REDIRECT_URI=https://app.example.com/callback` in the environment.
2. Invoke `getClient` with `client_id` value `"my-client"`.
3. Inspect the resolved return value.

**Expected Results:**
- Returned object has `client_id` equal to `"my-client"`.
- Returned object has `redirect_uris` equal to `["https://app.example.com/callback"]`.

### Scenario 7: getClient falls back when REDIRECT_URI is absent

**Steps:**
1. Ensure `REDIRECT_URI` is not set in the environment.
2. Invoke `getClient` with any `client_id`.
3. Inspect the resolved return value.

**Expected Results:**
- Returned object has `redirect_uris` equal to `["https://localhost:3000/callback"]`.

### Scenario 8: All registrations are called before HTTP listen

**Steps:**
1. Instrument or spy on `registerAllTools`, `registerProjectPrompts`, `registerAssessmentPrompts`, `registerProjectBriefPrompts`, and `registerPracteraResources`.
2. Launch the server module.
3. Record the call order relative to `app.listen`.

**Expected Results:**
- All five registration functions are called exactly once.
- All five registration functions are called before `app.listen` is invoked.
- Each registration function receives the `McpServer` instance as its first argument.

## Security Notes

- `PRACTERA_CLIENT_ID` and `REDIRECT_URI` must be supplied via environment variables or a `.env` file; their values must never be committed to source control.
- The `verifyAccessToken` implementation is noted as a placeholder; before production use, it must be replaced with a real cryptographic token verification call against the Practera authorization server.
- The `getClient` implementation is noted as a placeholder; production use requires a real client registry lookup.
- The CORS middleware line is commented out in source; if re-enabled, the wildcard origin (`*`) must be replaced with an explicit allowlist before production deployment.
- OAuth endpoints are fixed to `https://auth.practera.com`; any change to these URLs must be reviewed for redirect and token-interception risks.

## Dependencies

- `@modelcontextprotocol/sdk` — provides `McpServer` and `ProxyOAuthServerProvider`.
- `express` — HTTP server and middleware framework for SSE/message transport.
- `cors` — CORS middleware (imported but currently disabled via comment).
- `dotenv` — loads environment variables from `.env` at startup.
- `./tools/index` — exports `registerAllTools`.
- `./routes` — exports `setupRoutes`.
- `./prompts/index` — exports `registerProjectPrompts`, `registerAssessmentPrompts`, `registerProjectBriefPrompts`.
- `./resources/practera-resources` — exports `registerPracteraResources`.
- Environment variables: `PORT`, `NODE_ENV`, `PRACTERA_CLIENT_ID`, `REDIRECT_URI`.