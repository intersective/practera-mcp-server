# Get Assessment Tool

<!-- module: app/get-assessment / type: tool / status: draft -->

## Overview

The `mcp_practera_get_assessment` tool registers a query capability on the MCP server that retrieves detailed information about a single Practera assessment by its numeric ID. It accepts an optional API key and region parameter to authenticate and route the GraphQL request to the correct Practera environment. The tool fetches assessment metadata including groups and nested questions with their choices. The `assessmentId` parameter refers to the task ID, not the activity ID. On success the tool returns the raw JSON payload; on failure it returns a structured error message with `isError: true`.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `mcp_practera_get_assessment`.
- AC2: `assessmentId` is a required string parameter; `apikey` and `region` are optional strings.
- AC3: When `region` is omitted, the tool defaults to `"usa"`.
- AC4: When `apikey` is omitted, an empty string is used as the API key value.
- AC5: `assessmentId` is parsed to an integer before being sent as the GraphQL variable `id`.
- AC6: A successful response returns a single `content` item of type `"text"` containing the JSON-stringified GraphQL response (pretty-printed with 2-space indentation).
- AC7: Any error during the GraphQL request returns a `content` item of type `"text"` with a message prefixed `"Error fetching assessment: "` and sets `isError: true`.
- AC8: The GraphQL query requests the `reviewer: false` flag on the `assessment` field.
- AC9: The response payload includes assessment fields: `id`, `name`, `description`, `type`, `dueDate`, `isTeam`, `pulseCheck`, `groups` (with nested `questions` and `choices`).

## Scenarios

### Scenario 1: Successful assessment retrieval with all parameters

**Steps:**
1. Invoke `mcp_practera_get_assessment` with `assessmentId: "42"`, `apikey: "[REDACTED]"`, and `region: "aus"`.
2. Observe the GraphQL client is constructed with the provided region `"aus"` and the redacted API key.
3. Observe the GraphQL query is sent with variable `id: 42` (integer) and `reviewer: false`.
4. Capture the returned `ToolResult` object.

**Expected Results:**
- `content` array contains exactly one item.
- The item has `type: "text"`.
- The item's `text` field is valid JSON matching the GraphQL response body, formatted with 2-space indentation.
- `isError` is not set (or is `false`/`undefined`).

### Scenario 2: Successful assessment retrieval with defaults (no apikey or region)

**Steps:**
1. Invoke `mcp_practera_get_assessment` with only `assessmentId: "99"` (omit `apikey` and `region`).
2. Observe the GraphQL client is constructed with region `"usa"` and an empty string API key.
3. Observe the GraphQL query is sent with variable `id: 99` (integer).
4. Capture the returned `ToolResult` object.

**Expected Results:**
- `content` array contains exactly one item with `type: "text"`.
- The `text` field contains the JSON-stringified GraphQL response.
- `isError` is not set.

### Scenario 3: GraphQL request throws an Error object

**Steps:**
1. Configure the GraphQL client mock to throw `new Error("Unauthorized")` when `request` is called.
2. Invoke `mcp_practera_get_assessment` with `assessmentId: "10"`.
3. Capture the returned `ToolResult` object.

**Expected Results:**
- `content` array contains exactly one item with `type: "text"`.
- The `text` field equals `"Error fetching assessment: Unauthorized"`.
- `isError` is `true`.

### Scenario 4: GraphQL request throws a non-Error value

**Steps:**
1. Configure the GraphQL client mock to throw the string `"network timeout"` when `request` is called.
2. Invoke `mcp_practera_get_assessment` with `assessmentId: "10"`.
3. Capture the returned `ToolResult` object.

**Expected Results:**
- `content` array contains exactly one item with `type: "text"`.
- The `text` field equals `"Error fetching assessment: network timeout"`.
- `isError` is `true`.

### Scenario 5: assessmentId is converted from string to integer

**Steps:**
1. Invoke `mcp_practera_get_assessment` with `assessmentId: "007"`.
2. Intercept the variables passed to `client.request`.
3. Assert the `id` variable value.

**Expected Results:**
- The `id` variable sent to the GraphQL endpoint is the integer `7`, not the string `"007"`.

## Security Notes

- The `apikey` parameter must never be logged, echoed in error messages, or included in spec examples as a raw value; it must always be redacted.
- When `apikey` is omitted, an empty string is used — callers should ensure a valid key is supplied to avoid unauthenticated requests reaching the Practera API.
- The tool does not validate or sanitise `assessmentId` beyond `parseInt`; callers should ensure only trusted input is passed to prevent unexpected integer coercion (e.g., `parseInt("123abc")` yields `123`).

## Dependencies

- `zod` — runtime schema validation for tool parameter definitions.
- `@modelcontextprotocol/sdk/server/mcp.js` — MCP server registration (`McpServer`).
- `../libs/graphql-client` — `createGraphQLClient` factory used to build the authenticated GraphQL client.
- `./get-project` — `ToolResult` type shared across tools.
- Practera GraphQL API — external dependency; must expose the `assessment(id: Int!, reviewer: Boolean)` query with the fields enumerated in AC9.