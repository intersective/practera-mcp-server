# Practera MCP Server — stdio Transport Entry Point

<!-- module: app/stdio / type: transport / status: draft -->

## Overview

This module is the stdio transport entry point for the Practera MCP server, intended for use when Cursor spawns the server process directly and communicates over stdin/stdout. On startup it loads environment configuration from a `.env` file located one directory above the compiled source, then instantiates an `McpServer` named `practera-mcp` at version `1.0.0`. The server registers all tools, project prompts, assessment prompts, project-brief prompts, and Practera resources before connecting to a `StdioServerTransport`. This entry point is distinct from the SSE/HTTP transport (`server.ts`), which is used for remote or shared deployments.

## Acceptance Criteria

- AC1: The process MUST load environment variables from `<repo-root>/.env` before any server initialisation occurs.
- AC2: The MCP server MUST be created with `name = "practera-mcp"`, `version = "1.0.0"`, and capabilities advertising `prompts`, `tools`, and `resources`.
- AC3: All tools registered by `registerAllTools` MUST be available on the server before the transport connects.
- AC4: All prompts registered by `registerProjectPrompts`, `registerAssessmentPrompts`, and `registerProjectBriefPrompts` MUST be available on the server before the transport connects.
- AC5: All resources registered by `registerPracteraResources` MUST be available on the server before the transport connects.
- AC6: The server MUST connect exclusively via `StdioServerTransport` (stdin/stdout); no HTTP or SSE listener MUST be opened by this entry point.
- AC7: Secret values sourced from `.env` MUST NOT be logged or exposed in server metadata.

## Scenarios

### Scenario 1: Successful server startup with valid environment

**Steps:**
1. Place a valid `.env` file in the repository root containing required Practera API credentials (values redacted).
2. Execute `node src/stdio.js` (or equivalent compiled output) as a child process.
3. Observe the process's stdout stream for MCP protocol handshake messages.
4. Send a standard MCP `initialize` request over stdin.

**Expected Results:**
- The process starts without throwing an uncaught exception.
- The MCP `initialize` response received on stdout contains `serverInfo.name = "practera-mcp"` and `serverInfo.version = "1.0.0"`.
- The response's `capabilities` object includes non-null entries for `prompts`, `tools`, and `resources`.

### Scenario 2: Tool availability after startup

**Steps:**
1. Start the server as in Scenario 1.
2. Send an MCP `tools/list` request over stdin.
3. Read the response from stdout.

**Expected Results:**
- The response contains a non-empty array of tool descriptors.
- Each tool descriptor includes at minimum a `name` field.
- No error code is present in the response.

### Scenario 3: Prompt availability after startup

**Steps:**
1. Start the server as in Scenario 1.
2. Send an MCP `prompts/list` request over stdin.
3. Read the response from stdout.

**Expected Results:**
- The response contains prompt entries registered by `registerProjectPrompts`, `registerAssessmentPrompts`, and `registerProjectBriefPrompts`.
- No error code is present in the response.

### Scenario 4: Resource availability after startup

**Steps:**
1. Start the server as in Scenario 1.
2. Send an MCP `resources/list` request over stdin.
3. Read the response from stdout.

**Expected Results:**
- The response contains resource entries registered by `registerPracteraResources`.
- No error code is present in the response.

### Scenario 5: Missing .env file behaviour

**Steps:**
1. Ensure no `.env` file exists in the repository root.
2. Execute `node src/stdio.js` as a child process.
3. Observe process exit code and stderr output.

**Expected Results:**
- The process either exits with a non-zero code or emits an error-level message on stderr indicating missing configuration.
- No credentials or secret-like values appear in stderr or stdout output.

### Scenario 6: No HTTP or SSE port opened

**Steps:**
1. Start the server as in Scenario 1.
2. After the process is running, scan all listening TCP ports associated with the process (e.g., via `lsof -p <pid>` or equivalent).

**Expected Results:**
- No TCP listening sockets are associated with the process.
- All communication occurs exclusively over the process's stdin/stdout file descriptors.

## Security Notes

- The `.env` file MUST be excluded from version control; it contains credentials used to authenticate against the Practera GraphQL API.
- Raw credential values from `.env` MUST be redacted in any logs, error messages, or MCP metadata fields.
- Because communication is over stdio, the attack surface is limited to the spawning process (Cursor); no network port is exposed.
- Implementors MUST ensure that `dotenv` is called before any module that reads `process.env` for secrets, to prevent accidental use of undefined values.

## Dependencies

- `@modelcontextprotocol/sdk` — provides `McpServer` and `StdioServerTransport`.
- `dotenv` — loads environment variables from `<repo-root>/.env`.
- `src/tools/index.ts` — exports `registerAllTools`.
- `src/prompts/index.ts` — exports `registerProjectPrompts`, `registerAssessmentPrompts`, `registerProjectBriefPrompts`.
- `src/resources/practera-resources.ts` — exports `registerPracteraResources`.
- Node.js built-ins: `path`, `url` (for `__dirname` resolution in ESM context).