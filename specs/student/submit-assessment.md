# Submit Assessment Tool

<!-- module: app/student/submit-assessment / type: tool / status: draft / feature: deliver.submit.shell-->

## Overview

The `submit_assessment` MCP tool finalises an in-progress student assessment submission by executing a `SubmitAssessment` GraphQL mutation against the authenticated API. It requires a `submissionId` (obtained from `get_or_create_submission`), an `assessmentId`, and a `contextId` to identify the target submission. Optionally, inline answers may be provided to save and submit in a single step; if omitted, previously saved answers are used. Authentication is resolved via an API key, email, and region, all of which are optional and fall back to environment-level defaults. The tool returns a JSON-serialised `{ success, message }` response or a structured error payload.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `submit_assessment`.
- AC2: `submissionId`, `assessmentId`, and `contextId` are required numeric parameters; the tool must reject calls that omit any of them.
- AC3: `apikey`, `email`, and `region` are optional string parameters used solely for authentication context.
- AC4: When `answers` is provided, each entry must contain a numeric `questionId` and at least one of `answer` (string) or `choiceId` (number).
- AC5: On success, the tool returns a `content` array containing a single `text` item with the JSON-serialised `submitAssessment` response (`success`, `message`).
- AC6: On any error, the tool returns a `content` array with a `text` item prefixed `Error:` and sets `isError: true`.
- AC7: Raw credentials (API keys, tokens) must never appear in tool output or logs.

## Scenarios

### Scenario 1: Successful submission without inline answers

**Steps:**
1. Call `submit_assessment` with `submissionId: 42`, `assessmentId: 7`, `contextId: 3`, and no `answers` field.
2. The authenticated GraphQL client receives the `SubmitAssessment` mutation with `input: { submissionId: 42, assessmentId: 7, contextId: 3, answers: undefined }`.
3. The API responds with `{ submitAssessment: { success: true, message: "Submitted successfully" } }`.

**Expected Results:**
- The tool response contains exactly one `content` item of type `text`.
- The `text` value equals `JSON.stringify({ success: true, message: "Submitted successfully" }, null, 2)`.
- `isError` is absent or `false`.

---

### Scenario 2: Successful submission with inline answers

**Steps:**
1. Call `submit_assessment` with `submissionId: 10`, `assessmentId: 2`, `contextId: 5`, and `answers: [{ questionId: 1, answer: "Paris" }, { questionId: 2, choiceId: 3 }]`.
2. The authenticated GraphQL client receives the mutation with the full `answers` array in `input`.
3. The API responds with `{ submitAssessment: { success: true, message: "Submitted" } }`.

**Expected Results:**
- The tool response contains one `content` item of type `text`.
- The `text` value is the JSON-serialised `{ success: true, message: "Submitted" }` object with 2-space indentation.
- `isError` is absent or `false`.

---

### Scenario 3: API returns a failure response

**Steps:**
1. Call `submit_assessment` with `submissionId: 99`, `assessmentId: 1`, `contextId: 1`.
2. The API responds with `{ submitAssessment: { success: false, message: "Submission already finalised" } }`.

**Expected Results:**
- The tool response contains one `content` item of type `text`.
- The `text` value is the JSON-serialised `{ success: false, message: "Submission already finalised" }` object.
- `isError` is absent or `false` (the tool treats this as a valid API response, not a thrown error).

---

### Scenario 4: Authentication or network error

**Steps:**
1. Call `submit_assessment` with valid `submissionId`, `assessmentId`, and `contextId`, but the `createAuthenticatedClient` call throws an `Error` with message `"Unauthorized"`.

**Expected Results:**
- The tool response contains one `content` item of type `text`.
- The `text` value is exactly `"Error: Unauthorized"`.
- `isError` is `true`.

---

### Scenario 5: Non-Error exception thrown

**Steps:**
1. Call `submit_assessment` with valid required parameters, but the underlying client throws a plain string `"timeout"` (not an `Error` instance).

**Expected Results:**
- The tool response contains one `content` item of type `text`.
- The `text` value is exactly `"Error: timeout"`.
- `isError` is `true`.

---

### Scenario 6: Missing required parameter rejected

**Steps:**
1. Call `submit_assessment` omitting `submissionId` while providing `assessmentId: 1` and `contextId: 1`.

**Expected Results:**
- The MCP server rejects the call at the schema-validation layer before the handler executes.
- No GraphQL mutation is sent.
- An error is returned indicating `submissionId` is required.

## Security Notes

- `apikey` values passed as parameters must never be logged, echoed in responses, or included in error messages.
- Authentication credentials are forwarded only to `createAuthenticatedClient` and are not stored or returned by the tool.
- The tool does not validate or sanitise `answer` string content; upstream API is responsible for input sanitisation.

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server and tool registration.
- `zod` — Runtime schema validation for all tool parameters.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — Constructs an authenticated GraphQL client from optional `apikey`, `email`, and `region` parameters.
- Upstream GraphQL API — Must expose the `SubmitAssessment` mutation accepting `SubmitAssessmentInput` and returning `{ success: Boolean, message: String }`.
- `get_or_create_submission` tool — Must be called prior to obtain a valid `submissionId`.