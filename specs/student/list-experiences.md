# List Experiences Tool

<!-- module: app/student/list-experiences / type: tool / status: draft -->

## Overview

The `list_experiences` tool is an MCP (Model Context Protocol) server tool that retrieves all experiences the authenticated user is currently enrolled in. It accepts optional authentication parameters (`apikey`, `email`, `region`) and uses them to create an authenticated GraphQL client. The tool executes a `ListExperiences` GraphQL query and returns a formatted JSON list of experience records. Errors encountered during authentication or query execution are surfaced as error-flagged text responses.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `list_experiences`.
- AC2: The tool accepts three optional input parameters: `apikey` (string), `email` (string), and `region` (string).
- AC3: When called, the tool creates an authenticated client using the provided optional credentials.
- AC4: The tool executes a GraphQL query that retrieves `id`, `name`, `description`, `uuid`, and `status` for each experience.
- AC5: On success, the tool returns a `text` content item containing the experiences array serialised as pretty-printed JSON (2-space indent).
- AC6: On failure, the tool returns a `text` content item prefixed with `"Error: "` and sets `isError: true`.
- AC7: Raw credential values (API keys, tokens) must never appear in tool output or logs.

## Scenarios

### Scenario 1: Successful retrieval of enrolled experiences

**Steps:**
1. Invoke the `list_experiences` tool with no parameters (relying on ambient authentication).
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains a `content` array with exactly one item.
- The single content item has `type` equal to `"text"`.
- The `text` field is valid JSON representing an array of experience objects.
- Each experience object contains the keys `id`, `name`, `description`, `uuid`, and `status`.
- The `isError` field is absent or falsy.

### Scenario 2: Successful retrieval with explicit credentials

**Steps:**
1. Invoke the `list_experiences` tool supplying a valid `apikey`, `email`, and `region` parameter.
2. Observe the response object returned by the tool.

**Expected Results:**
- The authenticated client is constructed using the supplied `apikey`, `email`, and `region` values.
- The response contains a `content` array with one `text` item holding a JSON array.
- The raw `apikey` value does not appear anywhere in the returned `text` content.
- The `isError` field is absent or falsy.

### Scenario 3: Authentication failure

**Steps:**
1. Invoke the `list_experiences` tool with an invalid or expired `apikey`.
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains a `content` array with exactly one item of `type` `"text"`.
- The `text` field begins with the prefix `"Error: "`.
- The `isError` field is `true`.
- No partial experience data is included in the response.

### Scenario 4: GraphQL query execution error

**Steps:**
1. Invoke the `list_experiences` tool with valid credentials against an endpoint that returns a GraphQL error.
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains a `content` array with exactly one item of `type` `"text"`.
- The `text` field begins with the prefix `"Error: "` followed by the error message string.
- The `isError` field is `true`.

### Scenario 5: Empty experiences list

**Steps:**
1. Invoke the `list_experiences` tool with valid credentials for a user enrolled in no experiences.
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains a `content` array with one `text` item.
- The `text` field contains the JSON representation of an empty array (`[]`).
- The `isError` field is absent or falsy.

## Security Notes

- The `apikey` parameter is treated as a credential and must be redacted from any logs, traces, or error messages.
- Authentication is delegated entirely to `createAuthenticatedClient`; the tool itself does not store or cache credentials.
- Error messages returned to the caller must not echo back raw secret values; only the error message string from the caught exception is forwarded.

## Dependencies

- `zod` — runtime schema validation for tool input parameters.
- `@modelcontextprotocol/sdk/server/mcp` — MCP server and tool registration interface (`McpServer`).
- `../../libs/auth-helper` — `createAuthenticatedClient` factory responsible for credential resolution and authenticated GraphQL client construction.
- Upstream GraphQL API — must expose an `experiences` query returning `id`, `name`, `description`, `uuid`, and `status` fields.