# Assign Reviewer Tool

<!-- module: app/reviewer/assign-reviewer / type: tool / status: draft -->

## Overview

The Assign Reviewer tool registers an MCP server tool (`assign_reviewer`) that assigns a reviewer to a submitted assessment via a GraphQL mutation. It supports two reviewer types: `expert` (for mentors or coordinators) and `peer` (for fellow learners). An optional `reviewerId` parameter allows assignment of a specific user; when omitted, the system performs automatic assignment. Authentication is handled through an authenticated client constructed from optional `apikey`, `email`, and `region` parameters. The tool returns the updated submission's `id`, `status`, and reviewer details (`id`, `email`) on success, or a descriptive error message on failure.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `assign_reviewer`.
- AC2: `submissionId` (integer) and `reviewerType` (enum: `"expert"` or `"peer"`) are required parameters.
- AC3: `reviewerId` (integer), `apikey`, `email`, and `region` are optional parameters.
- AC4: When `reviewerType` is neither `"expert"` nor `"peer"`, the tool rejects the input before making any network request.
- AC5: When `reviewerId` is provided, the GraphQL mutation includes it; when omitted, the variable is absent or `undefined`.
- AC6: On success, the tool returns a JSON-formatted text payload containing `id`, `status`, and `reviewer` (`id`, `email`) from the `assignReviewer` mutation response.
- AC7: On any error (authentication failure, network error, GraphQL error), the tool returns a response with `isError: true` and a human-readable error message.
- AC8: Raw credentials (`apikey`) are never echoed back in any tool response.

## Scenarios

### Scenario 1: Successful expert reviewer auto-assignment

**Steps:**
1. Invoke the `assign_reviewer` tool with `submissionId: 101`, `reviewerType: "expert"`, and no `reviewerId`.
2. Observe the outgoing GraphQL mutation variables sent to the authenticated client.
3. Observe the tool response content.

**Expected Results:**
- The GraphQL mutation variable `reviewerType` equals `"expert"`.
- The GraphQL mutation variable `reviewerId` is `undefined` or absent.
- The response `content[0].type` equals `"text"`.
- The response `content[0].text` is valid JSON containing `id`, `status`, and `reviewer` fields.
- `isError` is not set to `true` on the response.

---

### Scenario 2: Successful peer reviewer assignment with specific reviewer ID

**Steps:**
1. Invoke the `assign_reviewer` tool with `submissionId: 202`, `reviewerType: "peer"`, and `reviewerId: 55`.
2. Observe the outgoing GraphQL mutation variables.
3. Observe the tool response content.

**Expected Results:**
- The GraphQL mutation variable `reviewerType` equals `"peer"`.
- The GraphQL mutation variable `reviewerId` equals `55`.
- The response `content[0].text` is valid JSON containing `reviewer.id` equal to the value returned by the API.
- `isError` is not set to `true` on the response.

---

### Scenario 3: Invalid reviewerType value rejected

**Steps:**
1. Invoke the `assign_reviewer` tool with `submissionId: 303`, `reviewerType: "admin"`.
2. Observe the tool response or schema validation error.

**Expected Results:**
- The tool does not execute the GraphQL mutation.
- A validation error is returned indicating `reviewerType` must be `"expert"` or `"peer"`.

---

### Scenario 4: Authentication failure returns error response

**Steps:**
1. Invoke the `assign_reviewer` tool with an invalid `apikey`, `submissionId: 404`, and `reviewerType: "expert"`.
2. Observe the tool response content.

**Expected Results:**
- The response `isError` equals `true`.
- The response `content[0].text` starts with `"Error:"` and contains a human-readable message.
- The raw `apikey` value does not appear anywhere in the response text.

---

### Scenario 5: GraphQL mutation returns an error

**Steps:**
1. Invoke the `assign_reviewer` tool with `submissionId: 999` (non-existent), `reviewerType: "peer"`, using valid credentials.
2. Simulate or observe the authenticated client throwing an error for the mutation.
3. Observe the tool response content.

**Expected Results:**
- The response `isError` equals `true`.
- The response `content[0].type` equals `"text"`.
- The response `content[0].text` starts with `"Error:"` and includes the error message thrown by the client.

---

### Scenario 6: Optional auth parameters forwarded to client

**Steps:**
1. Invoke the `assign_reviewer` tool with `submissionId: 505`, `reviewerType: "expert"`, `email: "user@example.com"`, and `region: "us-east"`.
2. Observe the arguments passed to `createAuthenticatedClient`.

**Expected Results:**
- `createAuthenticatedClient` is called with an object containing `email: "user@example.com"` and `region: "us-east"`.
- `apikey` in the call is `undefined` (not provided).

## Security Notes

- The `apikey` parameter must never be included in any tool response output, log, or error message.
- Authentication credentials (`apikey`, `email`) are passed only to `createAuthenticatedClient` and are not forwarded to the GraphQL mutation variables.
- All error messages returned to the caller must be derived from the caught error's `message` property or its string representation; raw internal stack traces should not be exposed.

## Dependencies

- `zod` — parameter schema definition and validation.
- `@modelcontextprotocol/sdk/server/mcp.js` — `McpServer` type and tool registration interface.
- `../../libs/auth-helper.js` — `createAuthenticatedClient` factory for constructing an authenticated GraphQL client from optional credentials and region.
- Downstream GraphQL API — must expose the `assignReviewer(submissionId, reviewerType, reviewerId)` mutation returning `{ id, status, reviewer { id, email } }`.