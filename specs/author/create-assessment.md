# Create Assessment Tool

<!-- module: app/author/create-assessment / type: tool / status: draft / feature: design.assessment.builder-->

## Overview

The `create_assessment` tool registers an MCP server action that creates a new assessment inside a specified experience. It requires an authenticated client, resolved via optional API key, email, and region parameters. The tool sends a GraphQL `createAssessment` mutation and returns the newly created assessment's `id` and `name`. Access is restricted to users holding an admin or coordinator role. Errors are caught and returned as structured error content rather than thrown exceptions.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `create_assessment`.
- AC2: `name`, `experienceId`, and `programId` are required parameters; all other parameters are optional.
- AC3: An authenticated GraphQL client is created using the provided `apikey`, `email`, and `region` (all optional); credentials are never logged or exposed in output.
- AC4: On success, the tool returns a JSON-formatted text content block containing the `id` and `name` of the created assessment.
- AC5: On failure, the tool returns a text content block prefixed with `Error:` and sets `isError: true`.
- AC6: The `type` parameter defaults to `moderated` when not supplied (as documented in the tool description).
- AC7: The `isTeam` boolean parameter correctly maps to the GraphQL input field controlling team assessment behaviour.

## Scenarios

### Scenario 1: Successful assessment creation with all parameters

**Steps:**
1. Invoke `create_assessment` with `name="Sprint Review"`, `experienceId=42`, `programId=7`, `description="End of sprint"`, `type="moderated"`, `isTeam=false`, `visibility=1`, and valid `apikey`, `email`, and `region` values.
2. Observe the GraphQL mutation sent to the server includes an `input` object containing all provided fields.
3. Observe the server responds with `{ createAssessment: { id: 101, name: "Sprint Review" } }`.

**Expected Results:**
- The tool returns a content array with one item of `type: "text"`.
- The text value is a JSON string equal to `{ "id": 101, "name": "Sprint Review" }` (pretty-printed with 2-space indent).
- `isError` is not set or is `false`.

---

### Scenario 2: Successful assessment creation with only required parameters

**Steps:**
1. Invoke `create_assessment` with only `name="Baseline Check"`, `experienceId=10`, and `programId=3`; omit all optional fields.
2. Observe the GraphQL mutation is sent with `description`, `type`, `isTeam`, and `visibility` as `undefined` in the input.
3. Observe the server responds with `{ createAssessment: { id: 55, name: "Baseline Check" } }`.

**Expected Results:**
- The tool returns a content array with one item of `type: "text"`.
- The text value is a JSON string containing `"id": 55` and `"name": "Baseline Check"`.
- No error flag is present in the response.

---

### Scenario 3: Authentication failure

**Steps:**
1. Invoke `create_assessment` with `name="Test"`, `experienceId=1`, `programId=1`, and an invalid or expired `apikey`.
2. Observe that `createAuthenticatedClient` throws an error with message `"Unauthorized"`.

**Expected Results:**
- The tool returns a content array with one item of `type: "text"`.
- The text value starts with `Error: Unauthorized`.
- The response object includes `isError: true`.

---

### Scenario 4: GraphQL mutation error (insufficient role)

**Steps:**
1. Invoke `create_assessment` with valid credentials for a user who holds neither admin nor coordinator role, plus `name="Restricted"`, `experienceId=5`, `programId=2`.
2. Observe that `client.request` throws an error with message `"Forbidden"`.

**Expected Results:**
- The tool returns a content array with one item of `type: "text"`.
- The text value starts with `Error: Forbidden`.
- The response object includes `isError: true`.

---

### Scenario 5: Non-Error object thrown during execution

**Steps:**
1. Simulate a scenario where `client.request` rejects with a plain string `"network timeout"` (not an `Error` instance).
2. Invoke `create_assessment` with `name="Timeout Test"`, `experienceId=3`, `programId=4`.

**Expected Results:**
- The tool returns a content array with one item of `type: "text"`.
- The text value is `Error: network timeout` (using `String(err)` path).
- The response object includes `isError: true`.

## Security Notes

- The `apikey` parameter must never be reproduced in tool output, logs, or error messages; it is passed only to `createAuthenticatedClient` and must be treated as a secret.
- Authentication is delegated entirely to `createAuthenticatedClient`; the tool itself performs no credential validation.
- Role enforcement (admin or coordinator) is expected to be applied server-side; the tool does not implement local role checks.

## Dependencies

- `zod` — parameter schema validation.
- `@modelcontextprotocol/sdk/server/mcp.js` — MCP server and tool registration interface.
- `../../libs/auth-helper.js` (`createAuthenticatedClient`) — authenticated GraphQL client factory.
- Upstream GraphQL API — must expose the `createAssessment(input: CreateAssessmentInput!)` mutation returning `id` and `name`.