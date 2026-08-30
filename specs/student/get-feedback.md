# Get Feedback Tool

<!-- module: app/student/get-feedback / type: tool / status: draft -->

## Overview

The `get_feedback` tool is an MCP (Model Context Protocol) server tool that retrieves review feedback for a specific assessment submission. It authenticates via an API key, email, and optional region, then executes a GraphQL query to fetch submission details including all associated reviews and their answers. Each review answer includes the answer text, reviewer comment, and the originating question name. The tool returns the submission data as formatted JSON or an error message if the request fails.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `get_feedback`.
- AC2: `submissionId` is a required numeric parameter; `apikey`, `email`, and `region` are optional string parameters.
- AC3: On success, the tool returns a `text` content block containing the submission object serialised as pretty-printed JSON (2-space indent).
- AC4: The returned submission object includes `id`, `status`, and a `reviews` array; each review includes `id`, `status`, and an `answers` array; each answer includes `id`, `answer`, `comment`, and `question.name`.
- AC5: On any error, the tool returns a `text` content block with a message prefixed `Error:` and sets `isError: true`.
- AC6: Authentication credentials (`apikey`, `email`, `region`) are forwarded to `createAuthenticatedClient` and are never logged or exposed in the response payload.

## Scenarios

### Scenario 1: Successful feedback retrieval for a valid submission

**Steps:**
1. Register the tool by calling `registerGetFeedbackTool(server)`.
2. Invoke the `get_feedback` tool with `submissionId: 42` and valid (mocked) `apikey` and `email` values.
3. Mock `createAuthenticatedClient` to return a client whose `request` method resolves with a `submission` object containing `id: 42`, `status: "reviewed"`, and one review with one answer.

**Expected Results:**
- The response `content` array contains exactly one item with `type` equal to `"text"`.
- The `text` field parses as valid JSON representing the submission object.
- The parsed JSON includes `id: 42`, `status: "reviewed"`, and a non-empty `reviews` array.
- Each review entry contains `id`, `status`, and an `answers` array where each answer contains `answer`, `comment`, and `question.name`.
- `isError` is absent or falsy.

### Scenario 2: Feedback retrieval with only the required parameter

**Steps:**
1. Invoke the `get_feedback` tool with only `submissionId: 7` (no `apikey`, `email`, or `region`).
2. Mock `createAuthenticatedClient` to accept `undefined` for optional fields and return a valid client.
3. Mock the client `request` to resolve with a minimal submission object (`id: 7`, `status: "pending"`, `reviews: []`).

**Expected Results:**
- `createAuthenticatedClient` is called with `{ apikey: undefined, email: undefined, region: undefined }`.
- The response `content[0].text` parses as JSON with `id: 7`, `status: "pending"`, and `reviews` equal to an empty array.
- `isError` is absent or falsy.

### Scenario 3: GraphQL request failure returns error response

**Steps:**
1. Invoke the `get_feedback` tool with `submissionId: 99` and any credential values.
2. Mock `createAuthenticatedClient` to return a client whose `request` method rejects with `new Error("Submission not found")`.

**Expected Results:**
- The response `content` array contains exactly one item with `type` equal to `"text"`.
- The `text` field equals `"Error: Submission not found"`.
- The response object includes `isError: true`.

### Scenario 4: Authentication failure returns error response

**Steps:**
1. Invoke the `get_feedback` tool with `submissionId: 10` and invalid credential values.
2. Mock `createAuthenticatedClient` to throw `new Error("Unauthorized")`.

**Expected Results:**
- The response `content[0].text` equals `"Error: Unauthorized"`.
- The response object includes `isError: true`.
- No submission data is present in the response.

### Scenario 5: Non-Error exception is handled gracefully

**Steps:**
1. Invoke the `get_feedback` tool with `submissionId: 5`.
2. Mock `createAuthenticatedClient` to return a client whose `request` method rejects by throwing the string `"timeout"`.

**Expected Results:**
- The response `content[0].text` equals `"Error: timeout"`.
- The response object includes `isError: true`.

## Security Notes

- `apikey` and `email` are optional credential parameters and must never appear in tool response payloads or server logs.
- The `region` parameter must be validated or sanitised within `createAuthenticatedClient` before use in any network request to prevent SSRF.
- Raw credential values must be redacted in any logging or error output produced by the tool or its dependencies.

## Dependencies

- `zod` — runtime parameter schema validation.
- `@modelcontextprotocol/sdk/server/mcp.js` — MCP server and tool registration interface (`McpServer`).
- `../../libs/auth-helper.js` — `createAuthenticatedClient` factory; responsible for authentication and returning a GraphQL-capable client with a `request` method.