# Get Project Tool

<!-- module: app/get-project / type: tool / status: draft -->

## Overview

The `mcp_practera_get_project` tool is registered on an MCP server and retrieves full structural details about a Practera project via a GraphQL API. It accepts an optional API key and an optional region identifier to target the correct Practera environment. The tool returns a JSON-serialised payload containing the project's id, name, milestones, activities, and tasks. On failure, it returns an error message with `isError: true` rather than throwing. The tool defaults to the `usa` region when no region is supplied.

## Acceptance Criteria

1. The tool is registered under the name `mcp_practera_get_project`.
2. Both `apikey` and `region` parameters are optional strings.
3. When `region` is omitted, the tool uses `usa` as the default region.
4. When `apikey` is omitted, an empty string is used for authentication.
5. A successful response contains a single `content` item of `type: "text"` whose `text` is a pretty-printed JSON string (2-space indent) of the GraphQL response data.
6. The GraphQL query requests: `project.id`, `project.name`, `milestones[].id/name/description/isLocked`, `activities[].id/name/description/instructions/isLocked/leadImage`, and `tasks[].id/name/type/isLocked/isTeam/deadline/contextId/assessmentType`.
7. On any error, the response sets `isError: true` and the `text` field begins with `"Error fetching project: "` followed by the error message.
8. The API key value is never logged or exposed beyond being passed to the GraphQL client.

## Scenarios

### Scenario 1: Successful project retrieval with explicit region and API key

**Steps:**
1. Call the tool `mcp_practera_get_project` with `{ apikey: "<REDACTED>", region: "aus" }`.
2. Intercept the outgoing GraphQL request to verify it targets the `aus` region endpoint.
3. Mock the GraphQL client to return a valid project payload containing `id`, `name`, and at least one milestone with one activity and one task.
4. Await the tool's returned `ToolResult`.

**Expected Results:**
- `result.isError` is `undefined` or `false`.
- `result.content` is an array with exactly one element.
- `result.content[0].type` equals `"text"`.
- `result.content[0].text` is valid JSON parseable by `JSON.parse`.
- The parsed JSON contains a `project` key with `id`, `name`, and `milestones` fields.
- The milestone entry contains `activities`, and each activity contains `tasks`.

### Scenario 2: Successful project retrieval with default region

**Steps:**
1. Call the tool `mcp_practera_get_project` with `{}` (no parameters).
2. Intercept the GraphQL client constructor call to capture the `region` argument.
3. Mock the GraphQL client to return a minimal valid project payload.
4. Await the tool's returned `ToolResult`.

**Expected Results:**
- The captured `region` argument equals `"usa"`.
- `result.isError` is `undefined` or `false`.
- `result.content[0].type` equals `"text"`.
- `result.content[0].text` is valid JSON.

### Scenario 3: Successful project retrieval with omitted API key

**Steps:**
1. Call the tool `mcp_practera_get_project` with `{ region: "stage" }` (no `apikey`).
2. Intercept the GraphQL client constructor call to capture the `authConfig` argument.
3. Mock the GraphQL client to return a minimal valid project payload.
4. Await the tool's returned `ToolResult`.

**Expected Results:**
- The captured `authConfig.apikey` equals `""` (empty string).
- `result.isError` is `undefined` or `false`.
- `result.content[0].text` is valid JSON.

### Scenario 4: GraphQL client throws an Error instance

**Steps:**
1. Mock the GraphQL client's `request` method to throw `new Error("Network timeout")`.
2. Call the tool `mcp_practera_get_project` with `{ region: "usa" }`.
3. Await the tool's returned `ToolResult`.

**Expected Results:**
- `result.isError` equals `true`.
- `result.content` has exactly one element with `type: "text"`.
- `result.content[0].text` equals `"Error fetching project: Network timeout"`.

### Scenario 5: GraphQL client throws a non-Error value

**Steps:**
1. Mock the GraphQL client's `request` method to throw the string `"unexpected failure"`.
2. Call the tool `mcp_practera_get_project` with `{ region: "usa" }`.
3. Await the tool's returned `ToolResult`.

**Expected Results:**
- `result.isError` equals `true`.
- `result.content[0].text` equals `"Error fetching project: unexpected failure"`.

### Scenario 6: Response JSON is correctly pretty-printed

**Steps:**
1. Mock the GraphQL client to return `{ project: { id: "1", name: "Test", milestones: [] } }`.
2. Call the tool `mcp_practera_get_project` with `{}`.
3. Await the tool's returned `ToolResult`.
4. Compare `result.content[0].text` against `JSON.stringify({ project: { id: "1", name: "Test", milestones: [] } }, null, 2)`.

**Expected Results:**
- `result.content[0].text` exactly matches the 2-space-indented JSON string.

## Security Notes

- The `apikey` parameter must be treated as a credential. It must not appear in logs, error messages, or any response payload.
- When `apikey` is absent, an empty string is passed to the GraphQL client; callers should be aware that unauthenticated requests may be rejected by the server.
- The tool does not validate or sanitise the `region` value before passing it to `createGraphQLClient`; downstream validation is the responsibility of that library.

## Dependencies

- `zod` — runtime parameter schema validation.
- `@modelcontextprotocol/sdk/server/mcp.js` — `McpServer` type and tool registration interface.
- `../libs/graphql-client` — `createGraphQLClient` factory; responsible for constructing the authenticated GraphQL client and resolving the region-specific endpoint.