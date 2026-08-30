# Export Experience Tool

<!-- module: app/author/export-experience / type: tool / status: draft -->

## Overview

The Export Experience tool registers an MCP server tool named `export_experience` that allows authorised users to export a complete experience as a JSON structure. The exported payload includes milestones, activities, assessments, and topics associated with the specified experience. Authentication is performed via an API key and/or email credential resolved through a shared auth helper. Access is restricted to users holding an admin or coordinator role. Errors encountered during authentication or the GraphQL mutation are surfaced as structured error responses rather than thrown exceptions.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the exact name `export_experience`.
- AC2: `experienceId` (integer) is a required parameter; `apikey`, `email`, and `region` are optional string parameters.
- AC3: On success, the tool returns a single `text` content item containing the pretty-printed JSON of the `exportExperience` response object.
- AC4: On failure (authentication error, network error, or GraphQL error), the tool returns a content item with an `Error: <message>` prefix and sets `isError: true`.
- AC5: The underlying GraphQL operation is a mutation (`ExportExperience`) that accepts an `Int!` variable `id` and returns the `experience` field.
- AC6: Credentials (`apikey`, `email`, `region`) are never included in the returned content payload.

## Scenarios

### Scenario 1: Successful export of an experience

**Steps:**
1. Invoke the `export_experience` tool with a valid `experienceId` (e.g., `42`) and valid `apikey`/`email` credentials for an admin or coordinator account.
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field is valid JSON, pretty-printed with 2-space indentation, representing the `exportExperience` payload.
- The JSON includes at least the `experience` key as returned by the server.
- `isError` is absent or falsy on the response.

### Scenario 2: Export fails due to invalid credentials

**Steps:**
1. Invoke the `export_experience` tool with a valid `experienceId` and an invalid or expired `apikey`.
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field begins with the prefix `"Error: "` followed by a non-empty error message.
- `isError` is `true` on the response.
- No credential values appear anywhere in the returned `text`.

### Scenario 3: Export fails due to non-existent experience ID

**Steps:**
1. Invoke the `export_experience` tool with a valid credential set and an `experienceId` that does not exist on the server (e.g., `999999`).
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field begins with `"Error: "` followed by a descriptive message from the server or client.
- `isError` is `true` on the response.

### Scenario 4: Tool invocation without optional parameters

**Steps:**
1. Invoke the `export_experience` tool supplying only `experienceId` (e.g., `7`), omitting `apikey`, `email`, and `region`.
2. Observe that the tool does not throw a validation error and proceeds to attempt authentication.

**Expected Results:**
- The tool accepts the invocation without a parameter validation error.
- `createAuthenticatedClient` is called with `apikey: undefined`, `email: undefined`, and `region: undefined`.
- The response is either a valid JSON export (if default credentials resolve) or an `isError: true` error response — never a schema validation failure.

### Scenario 5: Response JSON structure is correctly formatted

**Steps:**
1. Invoke the `export_experience` tool with a valid `experienceId` and credentials.
2. Parse the `text` field of the returned content item as JSON.

**Expected Results:**
- Parsing succeeds without a `SyntaxError`.
- The parsed object matches the shape of `data.exportExperience` as returned by the GraphQL mutation.
- Indentation in the raw `text` string uses exactly 2 spaces per level.

## Security Notes

- `apikey`, `email`, and `region` parameters are passed only to `createAuthenticatedClient` and must never be echoed back in tool output.
- Raw credential values must be redacted from any logs or error messages surfaced through the `text` content field.
- The tool description explicitly states that admin or coordinator role is required; enforcement is delegated to the server-side GraphQL resolver and the auth helper — the tool itself does not perform local role checks.
- The GraphQL variable is typed as `Int!`, preventing string injection via the `experienceId` parameter.

## Dependencies

- `zod` — parameter schema validation.
- `@modelcontextprotocol/sdk/server/mcp.js` — `McpServer` type and tool registration interface.
- `../../libs/auth-helper` — `createAuthenticatedClient` for credential resolution and authenticated HTTP client construction.
- Upstream GraphQL API — must expose the `exportExperience(id: Int!)` mutation returning an `experience` field.