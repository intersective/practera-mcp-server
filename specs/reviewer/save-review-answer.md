# Save Review Answer Tool

<!-- module: app/reviewer/save-review-answer / type: tool / status: draft / feature: deliver.review.reviewer-queue-->

## Overview

The `save_review_answer` tool registers an MCP server action that persists a reviewer's answer to a single review question via a GraphQL mutation. It is intended to be called once per question after retrieving the review assignment identifier from `list_pending_reviews`, and before finalising the review with `complete_review`. Authentication is established through an optional API key, email, and region, falling back to environment-level defaults when those parameters are omitted. The tool returns a JSON payload indicating save success and, when available, the resulting answer identifier.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `save_review_answer`.
- AC2: `reviewId` and `questionId` are required numeric parameters; the tool must reject calls that omit either.
- AC3: `submissionId` is optional but must be supplied when creating an answer for the first time.
- AC4: `answer` accepts a string or null; when omitted it defaults to null before being forwarded to the API.
- AC5: `comment` is an optional string forwarded as-is to the API.
- AC6: On success, the response content contains `{ "saved": true, "answerId": <value or null> }` as formatted JSON.
- AC7: On any error, the response sets `isError: true` and the content text begins with `Error:` followed by the error message.
- AC8: Credentials (`apikey`, `email`, `region`) must never appear in the tool's response output.

## Scenarios

### Scenario 1: Successful answer save with all parameters

**Steps:**
1. Invoke `save_review_answer` with `reviewId: 42`, `submissionId: 7`, `questionId: 3`, `answer: "Looks good"`, `comment: "Minor note"`, and valid `apikey`, `email`, and `region` values.
2. Observe the GraphQL mutation `saveReviewAnswer` is called with `input` containing all five fields.
3. Simulate the API returning `{ saveReviewAnswer: { success: true, message: "OK", id: 99 } }`.

**Expected Results:**
- Response `content[0].type` equals `"text"`.
- Response `content[0].text` is valid JSON containing `"saved": true` and `"answerId": 99`.
- `isError` is absent or falsy.

### Scenario 2: Successful answer save with answer omitted (defaults to null)

**Steps:**
1. Invoke `save_review_answer` with `reviewId: 10`, `questionId: 5`, and no `answer` field provided.
2. Observe the GraphQL mutation input forwarded to the API.

**Expected Results:**
- The `input.answer` field sent to the API equals `null`.
- Response `content[0].text` contains `"saved": true`.

### Scenario 3: API returns no id field

**Steps:**
1. Invoke `save_review_answer` with `reviewId: 1`, `questionId: 2`, `answer: "Test"`.
2. Simulate the API returning `{ saveReviewAnswer: { success: true, message: "OK" } }` (no `id` property).

**Expected Results:**
- Response `content[0].text` is valid JSON containing `"saved": true` and `"answerId": null` (or `undefined` serialised as absent).
- `isError` is absent or falsy.

### Scenario 4: Authentication failure

**Steps:**
1. Invoke `save_review_answer` with `reviewId: 1`, `questionId: 2`, and an invalid `apikey`.
2. Simulate `createAuthenticatedClient` throwing an `Error` with message `"Unauthorized"`.

**Expected Results:**
- Response `content[0].type` equals `"text"`.
- Response `content[0].text` equals `"Error: Unauthorized"`.
- Response `isError` equals `true`.

### Scenario 5: GraphQL mutation error

**Steps:**
1. Invoke `save_review_answer` with `reviewId: 5`, `questionId: 8`, `answer: "Draft"`.
2. Simulate `client.request` throwing an `Error` with message `"Network timeout"`.

**Expected Results:**
- Response `content[0].text` equals `"Error: Network timeout"`.
- Response `isError` equals `true`.

### Scenario 6: Non-Error exception thrown

**Steps:**
1. Invoke `save_review_answer` with valid required parameters.
2. Simulate `client.request` rejecting with a plain string `"unexpected failure"` (not an `Error` instance).

**Expected Results:**
- Response `content[0].text` equals `"Error: unexpected failure"`.
- Response `isError` equals `true`.

## Security Notes

- `apikey` is an optional credential parameter; it must be redacted from all logs, responses, and spec documentation. Raw values must never appear in output.
- Authentication is delegated entirely to `createAuthenticatedClient`; the tool itself performs no credential validation.
- The tool forwards only `reviewId`, `submissionId`, `questionId`, `answer`, and `comment` to the API — no credential fields are included in the GraphQL mutation input.

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server registration (`McpServer`, `server.tool`).
- `zod` — Runtime parameter schema validation.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — Authenticated GraphQL client construction.
- External GraphQL API — Must expose the `saveReviewAnswer(input: SaveReviewAnswerInput!)` mutation returning `{ success, message, id }`.
- `list_pending_reviews` tool — Must be called prior to obtain a valid `reviewId`.
- `complete_review` tool — Must be called after all answers are saved to finalise the review.