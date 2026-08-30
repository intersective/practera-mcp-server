# Save Submission Answer Tool

<!-- module: app/student/save-submission-answer / type: tool / status: draft -->

## Overview

The `save_submission_answer` tool is an MCP server tool that saves a single answer to an in-progress assessment submission via a GraphQL mutation. It must be called after `get_or_create_submission` to obtain a valid `submissionId`, and before `submit_assessment` to finalise all answers. The tool supports both text-based answers (for text or file questions) and choice-based answers (for single-choice or multiple-choice questions). Authentication is performed using an API key, email, and region, all of which are optional and resolved through the shared auth helper. On success, the tool returns the saved answer's ID; on failure, it returns a structured error message.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `save_submission_answer`.
- AC2: `submissionId` and `questionId` are required numeric parameters; the tool must reject calls that omit either.
- AC3: `answer` (nullable string) and `choiceId` (optional integer) are mutually optional; both may be omitted, one may be provided, or both may be provided simultaneously.
- AC4: On a successful GraphQL mutation response, the tool returns `{ "saved": true, "answerId": <id> }` as pretty-printed JSON in a `text` content block.
- AC5: If `answer` is not supplied, it is sent to the GraphQL API as `null` (not `undefined`).
- AC6: On any error (network, authentication, GraphQL), the tool returns a content block with `isError: true` and a message prefixed with `"Error: "`.
- AC7: Authentication credentials (`apikey`, `email`, `region`) are never included in the tool's response output.

## Scenarios

### Scenario 1: Save a text answer successfully

**Steps:**
1. Invoke `save_submission_answer` with `submissionId: 42`, `questionId: 7`, `answer: "My answer text"`, and valid authentication credentials.
2. The authenticated GraphQL client sends the `SaveSubmissionAnswer` mutation with `submissionId: 42`, `questionId: 7`, `answer: "My answer text"`, `choiceId: undefined`.
3. The GraphQL API responds with `{ saveSubmissionAnswer: { id: 101 } }`.

**Expected Results:**
- The tool returns a single content block of type `"text"`.
- The text content is valid JSON equal to `{ "saved": true, "answerId": 101 }` (pretty-printed with 2-space indentation).
- `isError` is not set (or is `false`) on the returned content block.

---

### Scenario 2: Save a choice-based answer successfully

**Steps:**
1. Invoke `save_submission_answer` with `submissionId: 10`, `questionId: 3`, `choiceId: 55`, and valid authentication credentials (no `answer` provided).
2. The authenticated GraphQL client sends the `SaveSubmissionAnswer` mutation with `submissionId: 10`, `questionId: 3`, `answer: null`, `choiceId: 55`.
3. The GraphQL API responds with `{ saveSubmissionAnswer: { id: 202 } }`.

**Expected Results:**
- The tool returns a single content block of type `"text"`.
- The text content is valid JSON equal to `{ "saved": true, "answerId": 202 }`.
- The `answer` field sent in the mutation variables is `null`, not `undefined`.

---

### Scenario 3: Authentication or network failure

**Steps:**
1. Invoke `save_submission_answer` with `submissionId: 5`, `questionId: 2`, `answer: "test"`, and credentials that cause `createAuthenticatedClient` to throw an `Error` with message `"Unauthorized"`.

**Expected Results:**
- The tool returns a single content block of type `"text"` with text `"Error: Unauthorized"`.
- The returned object includes `isError: true`.
- No partial answer data is returned.

---

### Scenario 4: GraphQL mutation returns an error

**Steps:**
1. Invoke `save_submission_answer` with `submissionId: 99`, `questionId: 1`, `answer: "bad"`, and valid authentication credentials.
2. The GraphQL client throws an `Error` with message `"Submission not found"` during `client.request(...)`.

**Expected Results:**
- The tool returns a single content block of type `"text"` with text `"Error: Submission not found"`.
- The returned object includes `isError: true`.

---

### Scenario 5: Non-Error exception is thrown

**Steps:**
1. Invoke `save_submission_answer` with valid parameters such that the internal execution throws a non-`Error` value (e.g., a plain string `"timeout"`).

**Expected Results:**
- The tool returns a content block with text `"Error: timeout"` (using `String(err)` coercion).
- The returned object includes `isError: true`.

---

### Scenario 6: Missing required parameter `submissionId`

**Steps:**
1. Invoke `save_submission_answer` without providing `submissionId`, but with `questionId: 3` and `answer: "test"`.

**Expected Results:**
- The MCP server rejects the call at the schema validation layer before the handler executes.
- No GraphQL mutation is sent.
- An error response is returned indicating the missing required field.

## Security Notes

- API keys, email addresses, and region values passed as authentication parameters must never appear in the tool's response output or logs.
- Raw credential values are REDACTED in all specification documentation and must not be reproduced in responses.
- The tool delegates authentication entirely to `createAuthenticatedClient`; no credential handling logic exists within the tool itself.
- Error messages surfaced to the caller must not include credential values even if the underlying error contains them.

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server and tool registration framework.
- `zod` — Runtime schema validation for tool input parameters.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — Authenticated GraphQL client factory; resolves credentials from `apikey`, `email`, and `region` parameters.
- GraphQL API — Must expose a `saveSubmissionAnswer(submissionId, questionId, answer, choiceId)` mutation returning `{ id }`.
- Upstream tools: `get_or_create_submission` (must be called first to obtain `submissionId`) and `submit_assessment` (must be called after all answers are saved).