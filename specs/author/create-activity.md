# Create Activity Tool

<!-- module: app/author/create-activity / type: tool / status: draft -->

## Overview

The `create_activity` tool registers an MCP server action that creates a new activity inside an existing milestone via a GraphQL mutation. It requires the caller to hold an admin or coordinator role on the target platform. Authentication is established through an API key and email pair scoped to an optional region. On success the tool returns the newly created activity's `id` and `name` as a JSON string; on failure it returns a descriptive error message with `isError: true`.

## Acceptance Criteria

1. The tool is registered on the MCP server under the name `create_activity`.
2. `milestoneId` and `name` are required parameters; all other parameters are optional.
3. An authenticated GraphQL client is created using the supplied `apikey`, `email`, and `region` values before the mutation is executed.
4. The `CreateActivity` GraphQL mutation is called with an `input` object containing exactly the fields: `milestoneId`, `name`, `description`, `instructions`, `visibility`, and `order`.
5. A successful response returns a `content` array containing a single `text` item with the JSON-serialised `createActivity` object (including `id` and `name`).
6. Any thrown error results in a `content` array with a `text` item prefixed `Error:` and `isError: true` on the response object.
7. Credentials (`apikey`, `email`) are never echoed back in any success or error response.

## Scenarios

### Scenario 1: Successful activity creation with all parameters

**Steps:**
1. Invoke `create_activity` with `milestoneId: 42`, `name: "Week 1 Quiz"`, `description: "Intro quiz"`, `instructions: "<p>Read chapter 1</p>"`, `visibility: 7`, `order: 1`, and valid (redacted) `apikey` and `email` credentials.
2. Verify that `createAuthenticatedClient` is called once with the supplied `apikey`, `email`, and `region` values.
3. Verify that the GraphQL client sends a `CreateActivity` mutation with `input.milestoneId = 42`, `input.name = "Week 1 Quiz"`, `input.description = "Intro quiz"`, `input.instructions = "<p>Read chapter 1</p>"`, `input.visibility = 7`, and `input.order = 1`.
4. Stub the GraphQL response to return `{ createActivity: { id: 101, name: "Week 1 Quiz" } }`.
5. Inspect the tool return value.

**Expected Results:**
- The return value has a `content` array with exactly one element.
- That element has `type: "text"`.
- The `text` field is valid JSON equal to `{ "id": 101, "name": "Week 1 Quiz" }` (pretty-printed with 2-space indent).
- `isError` is absent or falsy on the return value.

---

### Scenario 2: Successful activity creation with only required parameters

**Steps:**
1. Invoke `create_activity` with `milestoneId: 10`, `name: "Orientation"`, omitting all optional fields.
2. Verify that the GraphQL mutation `input` object contains `milestoneId: 10` and `name: "Orientation"`, with `description`, `instructions`, `visibility`, and `order` all `undefined`.
3. Stub the GraphQL response to return `{ createActivity: { id: 55, name: "Orientation" } }`.
4. Inspect the tool return value.

**Expected Results:**
- The return value has a `content` array with exactly one element of `type: "text"`.
- The `text` field parses to `{ "id": 55, "name": "Orientation" }`.
- `isError` is absent or falsy.

---

### Scenario 3: Authentication failure

**Steps:**
1. Configure `createAuthenticatedClient` to throw an `Error` with message `"Invalid API key"`.
2. Invoke `create_activity` with `milestoneId: 1`, `name: "Test"`, and an invalid (redacted) `apikey`.
3. Inspect the tool return value.

**Expected Results:**
- The return value has a `content` array with exactly one element of `type: "text"`.
- The `text` field equals `"Error: Invalid API key"`.
- `isError` is `true` on the return value.
- No credential values appear in the `text` field.

---

### Scenario 4: GraphQL mutation error

**Steps:**
1. Configure the authenticated GraphQL client to throw an `Error` with message `"Milestone not found"` when the mutation is executed.
2. Invoke `create_activity` with `milestoneId: 999`, `name: "Ghost Activity"`, and valid (redacted) credentials.
3. Inspect the tool return value.

**Expected Results:**
- The return value has a `content` array with exactly one element of `type: "text"`.
- The `text` field equals `"Error: Milestone not found"`.
- `isError` is `true` on the return value.

---

### Scenario 5: Non-Error exception thrown

**Steps:**
1. Configure the authenticated GraphQL client to throw a plain string `"unexpected failure"` (not an `Error` instance).
2. Invoke `create_activity` with `milestoneId: 5`, `name: "Edge Case"`, and valid (redacted) credentials.
3. Inspect the tool return value.

**Expected Results:**
- The `text` field equals `"Error: unexpected failure"`.
- `isError` is `true` on the return value.

## Security Notes

- `apikey` and `email` are accepted as optional string inputs and are passed directly to `createAuthenticatedClient`; they must never be logged, echoed in responses, or included in error messages.
- Credentials should be treated as secrets and redacted in any observability pipeline that captures tool invocations.
- The tool description explicitly states that admin or coordinator role is required; enforcement is delegated to the upstream GraphQL API and is not performed client-side.
- `instructions` accepts rich HTML; sanitisation of that content is the responsibility of the consuming API, not this tool.

## Dependencies

- `zod` — runtime parameter schema validation.
- `@modelcontextprotocol/sdk/server/mcp.js` — `McpServer` type and tool registration interface.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — constructs an authenticated GraphQL client from `apikey`, `email`, and `region`.
- Upstream GraphQL API — must expose the `CreateActivity` mutation accepting a `CreateActivityInput` type with fields `milestoneId`, `name`, `description`, `instructions`, `visibility`, and `order`, and returning `id` and `name`.