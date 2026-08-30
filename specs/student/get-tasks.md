# Get Tasks Tool

<!-- module: app/student/get-tasks / type: tool / status: draft -->

## Overview

The `get_tasks` tool is an MCP (Model Context Protocol) server tool that retrieves all tasks — including assessments and topics — contained within a specific activity. It authenticates via an API key, email, and region before executing a GraphQL query against the backend. The tool accepts an `activityId` parameter to scope the query and returns a JSON-formatted list of task objects. Errors encountered during authentication or data fetching are surfaced as error-flagged text responses.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `get_tasks`.
- AC2: The tool requires a numeric `activityId` parameter; `apikey`, `email`, and `region` are optional.
- AC3: On success, the tool returns a `text` content block containing a pretty-printed JSON array of tasks.
- AC4: Each task object in the response includes the fields: `id`, `name`, `type`, `isLocked`, `isTeam`, `assessmentType`, and `contextId`.
- AC5: On authentication or query failure, the tool returns a `text` content block with an `Error: <message>` prefix and sets `isError: true`.
- AC6: Credentials (`apikey`, `email`, `region`) are passed to `createAuthenticatedClient` and are never included in the returned content.

## Scenarios

### Scenario 1: Successful retrieval of tasks for a valid activity

**Steps:**
1. Invoke the `get_tasks` tool with a valid `activityId` (e.g., `42`) and valid optional credentials (`apikey`, `email`, `region`).
2. Observe the response returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field is a valid JSON string (parseable via `JSON.parse`).
- The parsed value is an array where each element contains the keys `id`, `name`, `type`, `isLocked`, `isTeam`, `assessmentType`, and `contextId`.
- `isError` is not present or is `false` on the response object.

### Scenario 2: Successful retrieval with no optional credentials supplied

**Steps:**
1. Invoke the `get_tasks` tool with only `activityId` (e.g., `10`), omitting `apikey`, `email`, and `region`.
2. Observe the response returned by the tool.

**Expected Results:**
- `createAuthenticatedClient` is called with `apikey`, `email`, and `region` all `undefined`.
- The response contains one content item with `type` equal to `"text"` and a valid JSON array as `text`.
- `isError` is not present or is `false`.

### Scenario 3: Authentication failure returns an error response

**Steps:**
1. Configure `createAuthenticatedClient` to throw an `Error` with message `"Unauthorized"`.
2. Invoke the `get_tasks` tool with any `activityId`.
3. Observe the response returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field starts with `"Error: Unauthorized"`.
- The response object has `isError` set to `true`.

### Scenario 4: GraphQL query failure returns an error response

**Steps:**
1. Configure the authenticated client's `request` method to throw an `Error` with message `"Activity not found"`.
2. Invoke the `get_tasks` tool with a non-existent `activityId` (e.g., `9999`).
3. Observe the response returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field starts with `"Error: Activity not found"`.
- The response object has `isError` set to `true`.

### Scenario 5: Non-Error exception is stringified in the error response

**Steps:**
1. Configure the authenticated client's `request` method to throw a plain string value (e.g., `"timeout"`).
2. Invoke the `get_tasks` tool with any `activityId`.
3. Observe the response returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field equals `"Error: timeout"`.
- The response object has `isError` set to `true`.

## Security Notes

- The `apikey` parameter must never appear in the tool's returned content or logs; it is consumed solely by `createAuthenticatedClient`.
- Credential values (`apikey`, `email`) are treated as optional inputs and should be redacted in any diagnostic output.
- Error messages returned to the caller must not include raw credential values even when authentication fails.

## Dependencies

- `zod` — runtime schema validation for tool input parameters.
- `@modelcontextprotocol/sdk` (`McpServer`) — MCP server registration and tool dispatch.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — handles credential resolution and authenticated HTTP client construction.
- Backend GraphQL API — must expose a `tasks(activityId: Int!)` query returning the fields `id`, `name`, `type`, `isLocked`, `isTeam`, `assessmentType`, and `contextId`.