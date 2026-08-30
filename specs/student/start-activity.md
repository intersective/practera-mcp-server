# Start Activity Tool

<!-- module: app/student/start-activity / type: tool / status: draft -->

## Overview

The `start_activity` tool is an MCP (Model Context Protocol) server tool that marks a specific activity as started for an authenticated learner. It executes a `startActivity` GraphQL mutation against the platform API, creating a progress record that causes the activity to appear as "in progress" on the learner's task list. Authentication is handled via an API key, email, and region combination passed at invocation time or resolved from environment defaults. The tool returns the newly created progress record ID on success, or a descriptive error message on failure.

## Acceptance Criteria

- AC-1: The tool is registered on the MCP server under the name `start_activity`.
- AC-2: `activityId` (integer) is a required parameter; `apikey`, `email`, and `region` are optional.
- AC-3: On success, the tool returns a JSON object with `started: true` and the `progressId` from the mutation response.
- AC-4: On failure (authentication error, network error, GraphQL error), the tool returns a response with `isError: true` and a human-readable error message.
- AC-5: Credentials (`apikey`, `email`) are never echoed back in the tool's output content.
- AC-6: The tool invokes the `startActivity` GraphQL mutation with the provided `activityId` as an `Int!` variable.

## Scenarios

### Scenario 1: Successful activity start

**Steps:**
1. Invoke the `start_activity` tool with a valid `activityId` (e.g., `42`) and valid authentication credentials (`apikey`, `email`, `region`).
2. Observe the response returned by the tool.

**Expected Results:**
- The response `content` array contains exactly one item of `type: "text"`.
- The `text` field parses as valid JSON.
- The parsed JSON contains `"started": true`.
- The parsed JSON contains a `"progressId"` field whose value matches the `id` returned by the `startActivity` mutation.
- The response does not contain an `isError` field set to `true`.

---

### Scenario 2: Missing or invalid activityId

**Steps:**
1. Invoke the `start_activity` tool without providing `activityId`, or provide a non-integer value.
2. Observe the response returned by the tool.

**Expected Results:**
- The tool does not execute the GraphQL mutation.
- The response indicates a validation or parameter error (either via MCP schema rejection or `isError: true`).

---

### Scenario 3: Authentication failure

**Steps:**
1. Invoke the `start_activity` tool with a valid `activityId` (e.g., `42`) but with invalid or missing credentials (e.g., a malformed `apikey`).
2. Observe the response returned by the tool.

**Expected Results:**
- The response `content` array contains exactly one item of `type: "text"`.
- The `text` field begins with `"Error:"` followed by a descriptive message.
- The response includes `isError: true`.
- No credential values are present in the `text` field.

---

### Scenario 4: GraphQL mutation returns no data

**Steps:**
1. Invoke the `start_activity` tool with a valid `activityId` for an activity that does not exist or cannot be started (API returns `null` for `startActivity`).
2. Observe the response returned by the tool.

**Expected Results:**
- The response `content` array contains exactly one item of `type: "text"`.
- The `text` field parses as valid JSON.
- The parsed JSON contains `"started": true`.
- The parsed JSON contains `"progressId": null` (since `data?.startActivity?.id` resolves to `undefined`/`null`).
- The response does not contain `isError: true`.

---

### Scenario 5: Network or unexpected runtime error

**Steps:**
1. Simulate a network failure or runtime exception during the `client.request` call (e.g., by making the API endpoint unreachable).
2. Invoke the `start_activity` tool with a valid `activityId`.
3. Observe the response returned by the tool.

**Expected Results:**
- The response `content` array contains exactly one item of `type: "text"`.
- The `text` field begins with `"Error:"` followed by the exception's message string.
- The response includes `isError: true`.

## Security Notes

- `apikey` and `email` parameters are treated as credentials and must never appear in tool output, logs, or error messages.
- All credential values passed to `createAuthenticatedClient` must be REDACTED in any logging or diagnostic output.
- The tool relies on `createAuthenticatedClient` to enforce authentication; no unauthenticated requests should reach the GraphQL API.
- `activityId` is typed as `Int!` in the GraphQL mutation, preventing string injection via that parameter.

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server and tool registration framework.
- `zod` — Runtime parameter schema validation.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — Authenticated GraphQL client factory; resolves credentials and constructs the API client.
- Platform GraphQL API — Must expose the `startActivity(activityId: Int!): { id }` mutation.