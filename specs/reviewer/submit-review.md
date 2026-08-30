# Submit Review Tool

<!-- module: app/reviewer/submit-review / type: tool / status: draft -->

## Overview

The Submit Review tool registers an MCP server tool named `submit_review` that allows a reviewer to finalise and submit a completed review for an assessment submission. It authenticates the caller using optional API key, email, and region parameters before executing a `SubmitReview` GraphQL mutation against the backend. The mutation accepts a required numeric `reviewId` and returns a `success` boolean indicating whether the submission succeeded. Errors encountered during authentication or the GraphQL request are caught and returned as error-flagged text responses.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `submit_review`.
- AC2: `reviewId` is a required integer parameter; `apikey`, `email`, and `region` are optional string parameters.
- AC3: An authenticated client is created using the provided credentials before any GraphQL request is made.
- AC4: On success, the tool returns a JSON-serialised representation of the `submitReview.success` field with 2-space indentation.
- AC5: On failure (authentication error or GraphQL error), the tool returns a response with `isError: true` and a human-readable error message prefixed with `"Error: "`.
- AC6: No raw credentials or secret values are logged or included in any response payload.

## Scenarios

### Scenario 1: Successful review submission

**Steps:**
1. Call the `submit_review` tool with a valid `reviewId` (e.g., `42`) and valid optional credentials (`apikey`, `email`, `region`).
2. Verify that `createAuthenticatedClient` is invoked with the supplied credential parameters.
3. Verify that the `SubmitReview` GraphQL mutation is sent with variable `reviewId: 42`.
4. Stub the GraphQL response to return `{ submitReview: { success: true } }`.

**Expected Results:**
- The tool response `content` array contains exactly one item of type `"text"`.
- The `text` value equals `'{\n  "success": true\n}'`.
- `isError` is not present or is `false` on the response object.

---

### Scenario 2: Submission with missing optional credentials

**Steps:**
1. Call the `submit_review` tool with only `reviewId` (e.g., `7`) and no `apikey`, `email`, or `region` values.
2. Verify that `createAuthenticatedClient` is called with `{ apikey: undefined, email: undefined, region: undefined }`.
3. Stub the GraphQL response to return `{ submitReview: { success: true } }`.

**Expected Results:**
- The tool response `content` array contains one item of type `"text"`.
- The `text` value equals `'{\n  "success": true\n}'`.
- No error is raised due to the absence of optional parameters.

---

### Scenario 3: Authentication failure

**Steps:**
1. Configure `createAuthenticatedClient` to throw an `Error` with message `"Invalid API key"`.
2. Call the `submit_review` tool with any `reviewId` and any credentials.
3. Observe the returned response object.

**Expected Results:**
- The response `content` array contains one item of type `"text"`.
- The `text` value equals `"Error: Invalid API key"`.
- The response includes `isError: true`.

---

### Scenario 4: GraphQL mutation returns an error

**Steps:**
1. Configure `createAuthenticatedClient` to return a valid client stub.
2. Configure the client's `request` method to throw an `Error` with message `"Review not found"`.
3. Call the `submit_review` tool with `reviewId: 99`.
4. Observe the returned response object.

**Expected Results:**
- The response `content` array contains one item of type `"text"`.
- The `text` value equals `"Error: Review not found"`.
- The response includes `isError: true`.

---

### Scenario 5: Non-Error exception thrown during request

**Steps:**
1. Configure the client's `request` method to throw a plain string value `"unexpected failure"` (not an `Error` instance).
2. Call the `submit_review` tool with `reviewId: 5`.
3. Observe the returned response object.

**Expected Results:**
- The response `content` array contains one item of type `"text"`.
- The `text` value equals `"Error: unexpected failure"`.
- The response includes `isError: true`.

## Security Notes

- The `apikey` parameter must never appear in any response payload, log output, or error message.
- `createAuthenticatedClient` is responsible for all credential validation; the tool itself performs no credential inspection.
- Credentials passed as parameters should be treated as sensitive and must be redacted from any diagnostic output.

## Dependencies

- `zod` — runtime parameter schema validation.
- `@modelcontextprotocol/sdk/server/mcp.js` — MCP server and tool registration interface (`McpServer`).
- `../../libs/auth-helper.js` — `createAuthenticatedClient` factory used to produce an authenticated GraphQL client.
- Backend GraphQL API — must expose the `submitReview(reviewId: Int!): { success: Boolean }` mutation.