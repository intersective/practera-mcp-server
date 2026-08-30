# Add Question to Assessment Tool

<!-- module: app/author/add-question / type: tool / status: draft -->

## Overview

The `add_question` tool registers an MCP server action that adds a new question to an existing assessment via a GraphQL mutation. It requires the caller to supply an assessment ID and a question name at minimum, with several optional fields controlling question behaviour and visibility. Authentication is performed using an API key, email, and region, which are resolved through a shared authentication helper. The tool is restricted to users holding an admin or coordinator role. On success it returns the newly created question's `id` and `name`; on failure it returns a structured error message.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `add_question`.
- AC2: `assessmentId` (number) and `name` (string) are required parameters; all other parameters are optional.
- AC3: Authentication credentials (`apikey`, `email`, `region`) are accepted as optional parameters and forwarded to the authentication helper — raw credential values must never appear in logs or responses.
- AC4: A `createAssessmentQuestion` GraphQL mutation is executed with the provided input fields.
- AC5: On success, the response content contains the JSON representation of the created question (`id` and `name`).
- AC6: On failure, the response content contains an error message string prefixed with `"Error: "` and `isError` is set to `true`.
- AC7: Optional fields (`description`, `questionType`, `isRequired`, `hasComment`, `audience`) are passed through to the mutation input when provided.

## Scenarios

### Scenario 1: Successful question creation with required fields only

**Steps:**
1. Invoke the `add_question` tool with `assessmentId: 42` and `name: "What is your risk tolerance?"`, omitting all optional fields.
2. Observe the GraphQL request sent to the server.
3. Observe the tool response content.

**Expected Results:**
- The GraphQL mutation payload contains `assessmentId: 42` and `name: "What is your risk tolerance?"`.
- All optional input fields (`description`, `questionType`, `isRequired`, `hasComment`, `audience`) are `undefined` or absent in the mutation input.
- The response `content[0].type` equals `"text"`.
- The response `content[0].text` is valid JSON containing an `id` field and a `name` field matching the created question.
- `isError` is not set to `true`.

### Scenario 2: Successful question creation with all optional fields supplied

**Steps:**
1. Invoke the `add_question` tool with `assessmentId: 7`, `name: "Rate the process"`, `description: "Additional context"`, `questionType: "oneof"`, `isRequired: true`, `hasComment: false`, `audience: "both"`.
2. Observe the GraphQL mutation input forwarded by the tool.
3. Observe the tool response content.

**Expected Results:**
- The mutation input includes all seven fields with the exact values provided.
- The response `content[0].text` is valid JSON containing `id` and `name` of the created question.
- `isError` is not set to `true`.

### Scenario 3: Authentication failure

**Steps:**
1. Configure the authentication helper to throw an error (e.g., invalid API key).
2. Invoke the `add_question` tool with `assessmentId: 1` and `name: "Test question"`.
3. Observe the tool response.

**Expected Results:**
- The response `content[0].type` equals `"text"`.
- The response `content[0].text` starts with `"Error: "` followed by the error message from the thrown exception.
- The response `isError` equals `true`.
- No credential values appear in the error text.

### Scenario 4: GraphQL mutation returns an error

**Steps:**
1. Configure the authenticated GraphQL client to throw an error on `createAssessmentQuestion`.
2. Invoke the `add_question` tool with `assessmentId: 99` and `name: "Failing question"`.
3. Observe the tool response.

**Expected Results:**
- The response `content[0].text` starts with `"Error: "` and includes the GraphQL error message.
- The response `isError` equals `true`.

### Scenario 5: Missing required parameter `assessmentId`

**Steps:**
1. Invoke the `add_question` tool without supplying `assessmentId`.
2. Observe the validation outcome.

**Expected Results:**
- The tool rejects the invocation before executing the mutation.
- An error is returned indicating `assessmentId` is required (Zod validation failure).

### Scenario 6: Missing required parameter `name`

**Steps:**
1. Invoke the `add_question` tool with `assessmentId: 5` but without supplying `name`.
2. Observe the validation outcome.

**Expected Results:**
- The tool rejects the invocation before executing the mutation.
- An error is returned indicating `name` is required (Zod validation failure).

## Security Notes

- `apikey`, `email`, and `region` are accepted as optional inputs and passed directly to `createAuthenticatedClient`; raw values must be redacted from all logs, telemetry, and error responses.
- The tool description states that admin or coordinator role is required; enforcement is expected to occur server-side within the GraphQL API, not within this tool itself.
- No credential values from input parameters should be echoed back in success or error responses.

## Dependencies

- `@modelcontextprotocol/sdk/server/mcp` — MCP server and tool registration.
- `zod` — Input schema validation for all tool parameters.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — Authenticated GraphQL client construction using optional `apikey`, `email`, and `region`.
- GraphQL API endpoint — Must expose the `createAssessmentQuestion(input: CreateAssessmentQuestionInput!)` mutation returning `id` and `name`.