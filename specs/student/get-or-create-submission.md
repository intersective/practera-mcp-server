# Get or Create Submission Tool

<!-- module: app/student/get-or-create-submission / type: tool / status: draft / feature: deliver.submit.shell-->

## Overview

This tool registers an MCP server action named `get_or_create_submission` that queries an assessment's submissions for a given context via the GraphQL API. If no submission exists, the GraphQL API automatically creates a new in-progress submission. The tool returns the first submission found, including its `id`, `status`, and any existing `answers`. The returned `submissionId` is required by downstream tools such as `save_submission_answer` and `submit_assessment`. Authentication is performed using an API key, email, and region, all of which are optional and resolved via a shared auth helper.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `get_or_create_submission`.
- AC2: The tool accepts `assessmentId` (required integer) and `contextId` (required integer) as inputs.
- AC3: The tool accepts optional `apikey`, `email`, and `region` parameters for authentication.
- AC4: When the GraphQL response contains one or more submissions, the tool returns the first submission as formatted JSON, including `id`, `status`, and `answers` (each with `id`, `questionId`, `answer`, `choiceId`).
- AC5: When the GraphQL response contains no submissions, the tool returns a JSON object with an `error` field indicating the caller should check `assessmentId` and `contextId`.
- AC6: When an exception is thrown during execution, the tool returns an error response with `isError: true` and a descriptive message.
- AC7: Raw credential values are never included in tool output or logs.

## Scenarios

### Scenario 1: Existing submission is retrieved successfully

**Steps:**
1. Invoke `get_or_create_submission` with a valid `assessmentId` (e.g., `42`) and `contextId` (e.g., `7`), and valid authentication parameters.
2. The GraphQL API responds with one or more submissions for the given assessment and context.

**Expected Results:**
- The response `content` array contains exactly one item of type `text`.
- The `text` value is valid JSON representing the first submission object.
- The JSON object contains the fields `id`, `status`, and `answers`.
- Each entry in `answers` contains `id`, `questionId`, `answer`, and `choiceId`.
- `isError` is not set to `true`.

---

### Scenario 2: No existing submission — API auto-creates one

**Steps:**
1. Invoke `get_or_create_submission` with a valid `assessmentId` and `contextId` for which no prior submission exists.
2. The GraphQL API automatically creates a new in-progress submission and returns it in the `submissions` array.

**Expected Results:**
- The response `content` array contains exactly one item of type `text`.
- The `text` value is valid JSON representing the newly created submission.
- The JSON object contains `id`, `status` (expected to be an in-progress state), and `answers` (may be an empty array).
- `isError` is not set to `true`.

---

### Scenario 3: GraphQL returns an empty submissions array

**Steps:**
1. Invoke `get_or_create_submission` with an `assessmentId` and `contextId` combination that results in an empty `submissions` array from the GraphQL API (e.g., invalid IDs that bypass auto-creation).
2. Observe the tool response.

**Expected Results:**
- The response `content` array contains exactly one item of type `text`.
- The `text` value is valid JSON containing the key `error`.
- The `error` value is the string `"No submission created — check assessmentId and contextId"`.
- `isError` is not set to `true`.

---

### Scenario 4: Authentication or network error

**Steps:**
1. Invoke `get_or_create_submission` with an invalid or missing API key that causes `createAuthenticatedClient` to throw an error.
2. Observe the tool response.

**Expected Results:**
- The response `content` array contains exactly one item of type `text`.
- The `text` value begins with the prefix `"Error: "` followed by the error message.
- The response includes `isError: true`.
- No credential values appear in the error text.

---

### Scenario 5: GraphQL request fails with a runtime error

**Steps:**
1. Invoke `get_or_create_submission` with valid authentication but simulate a GraphQL request failure (e.g., network timeout or server error) causing `client.request` to throw.
2. Observe the tool response.

**Expected Results:**
- The response `content` array contains exactly one item of type `text`.
- The `text` value begins with `"Error: "` followed by the thrown error's message.
- The response includes `isError: true`.

## Security Notes

- The `apikey` parameter must never be echoed back in any tool response or error message.
- Authentication credentials (`apikey`, `email`) are passed only to `createAuthenticatedClient` and are not included in GraphQL query variables or tool output.
- All credential handling is delegated to the shared `auth-helper` library; this tool does not perform credential storage or logging.

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server and tool registration interface.
- `zod` — Input schema validation for tool parameters.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — Resolves and applies authentication credentials to produce a GraphQL client.
- GraphQL API — Must support the `assessment(id)` query with a `submissions(contextId)` sub-field that auto-creates an in-progress submission when none exists.
- Downstream tools: `save_submission_answer`, `submit_assessment` — Consume the `id` returned by this tool.