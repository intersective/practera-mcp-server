# Complete Review Tool

<!-- module: app/reviewer/complete-review / type: tool / status: draft / feature: deliver.review.reviewer-queue-->

## Overview

The `complete_review` MCP tool finalises a review session by marking it as done and making reviewer feedback visible to the learner. It accepts an optional array of inline answers, allowing the caller to save and submit answers in a single operation. The tool authenticates via `createAuthenticatedClient` using an optional API key, email, and region, then executes a `submitReview` GraphQL mutation. On success it returns the updated review's `id` and `status`; on failure it returns an error message with `isError: true`.

## Acceptance Criteria

1. The tool is registered on the MCP server under the name `complete_review`.
2. `reviewId` (integer) is a required parameter; `apikey`, `email`, `region`, and `answers` are optional.
3. Each element of `answers`, when provided, must contain a numeric `questionId` and optionally an `answer` string and/or a numeric `choiceId`.
4. On a successful mutation the response content contains a JSON-serialised object with at least `id` and `status` fields.
5. On any error the response content contains a human-readable error message and `isError` is set to `true`.
6. Credentials (`apikey`) are never echoed back in any response payload.

## Scenarios

### Scenario 1: Successful review completion without inline answers

**Steps:**
1. Call the `complete_review` tool with a valid `reviewId` (e.g. `42`) and no `answers` parameter.
2. Observe the GraphQL mutation sent to the API: `submitReview(id: 42, answers: undefined)`.
3. The API returns `{ id: 42, status: "completed" }`.

**Expected Results:**
- The tool response `content[0].type` equals `"text"`.
- The tool response `content[0].text` is valid JSON containing `"id": 42` and a `"status"` field.
- `isError` is absent or `false`.

---

### Scenario 2: Successful review completion with inline answers

**Steps:**
1. Call the `complete_review` tool with `reviewId: 7` and `answers: [{ questionId: 1, answer: "Great work" }, { questionId: 2, choiceId: 3 }]`.
2. Observe that the mutation variable `answers` contains both answer objects as supplied.
3. The API returns `{ id: 7, status: "completed" }`.

**Expected Results:**
- The tool response `content[0].text` is valid JSON containing `"id": 7` and `"status"`.
- `isError` is absent or `false`.

---

### Scenario 3: Authentication failure

**Steps:**
1. Call the `complete_review` tool with `reviewId: 10` and an invalid or missing `apikey`.
2. `createAuthenticatedClient` throws an authentication error.

**Expected Results:**
- The tool response `content[0].type` equals `"text"`.
- The tool response `content[0].text` starts with `"Error:"` and contains the authentication error message.
- `isError` is `true`.

---

### Scenario 4: GraphQL mutation error (e.g. review not found)

**Steps:**
1. Call the `complete_review` tool with a `reviewId` that does not exist (e.g. `99999`).
2. The authenticated client's `request` method throws or rejects with a descriptive error.

**Expected Results:**
- The tool response `content[0].text` starts with `"Error:"` and includes the error detail returned by the API.
- `isError` is `true`.

---

### Scenario 5: Partial answer object (only questionId provided)

**Steps:**
1. Call the `complete_review` tool with `reviewId: 5` and `answers: [{ questionId: 4 }]` (no `answer` or `choiceId`).
2. Verify the schema validation passes (both `answer` and `choiceId` are optional).
3. The API processes the mutation and returns `{ id: 5, status: "completed" }`.

**Expected Results:**
- No validation error is thrown before the API call.
- The tool response `content[0].text` contains valid JSON with `"id": 5` and `"status"`.
- `isError` is absent or `false`.

## Security Notes

- `apikey` is an optional credential parameter. It must **never** appear in any tool response, log output, or error message.
- Authentication is delegated entirely to `createAuthenticatedClient`; the tool itself performs no credential storage or caching.
- All credential values in transit must be treated as secrets and redacted from any observability tooling.

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server registration and tool interface.
- `zod` — Runtime schema validation for all input parameters.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — Authenticated GraphQL client factory; handles API key, email, and region resolution.
- Upstream GraphQL API — Must expose the `submitReview(id: Int!, answers: [ReviewAnswerInput])` mutation returning `{ id, status }`.