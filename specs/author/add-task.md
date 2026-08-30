# Add Task to Activity Tool

<!-- module: app/author/add-task / type: tool / status: draft -->

## Overview

The `add_task_to_activity` MCP tool allows authorised users to append a task — either an assessment (`Assess.Assessment`) or a topic (`Story.Topic`) — to an existing activity sequence. It authenticates via an API key and email combination scoped to a specific region before executing a GraphQL mutation against the backend. The tool returns a structured success/message response from the server or a descriptive error message on failure. Access is restricted to users holding an admin or coordinator role.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `add_task_to_activity`.
- AC2: `activityId` and `modelId` must be numeric and are required; the tool must reject calls that omit them.
- AC3: `model` must be exactly one of `Assess.Assessment` or `Story.Topic`; any other value must be rejected.
- AC4: `order`, `apikey`, `email`, and `region` are optional parameters.
- AC5: On success, the tool returns a JSON-formatted object containing `success` and `message` fields from the `addTaskToActivity` mutation response.
- AC6: On any error (authentication failure, network error, GraphQL error), the tool returns a response with `isError: true` and a human-readable error message.
- AC7: Authentication credentials (`apikey`, `email`, `region`) must never be echoed back in the tool response.

## Scenarios

### Scenario 1: Successfully add an assessment to an activity

**Steps:**
1. Call `add_task_to_activity` with a valid `apikey`, `email`, `region`, `activityId: 42`, `model: "Assess.Assessment"`, `modelId: 7`, and `order: 1`.
2. Observe the response content array.

**Expected Results:**
- The response contains exactly one content item of type `"text"`.
- The text is valid JSON with a top-level `success` field set to `true`.
- The text includes a `message` field (string).
- `isError` is absent or `false`.

---

### Scenario 2: Successfully add a topic to an activity without specifying order

**Steps:**
1. Call `add_task_to_activity` with a valid `apikey`, `email`, `region`, `activityId: 10`, `model: "Story.Topic"`, `modelId: 3` (omitting `order`).
2. Observe the response content array.

**Expected Results:**
- The response contains exactly one content item of type `"text"`.
- The text is valid JSON containing `success` and `message` fields.
- `isError` is absent or `false`.

---

### Scenario 3: Reject an invalid model type

**Steps:**
1. Call `add_task_to_activity` with `activityId: 1`, `model: "Invalid.Type"`, and `modelId: 5`.
2. Observe the tool's validation response.

**Expected Results:**
- The tool does not execute the GraphQL mutation.
- An error or validation failure is returned indicating the `model` value is not accepted.

---

### Scenario 4: Handle authentication failure

**Steps:**
1. Call `add_task_to_activity` with an invalid or expired `apikey`, a valid `activityId: 20`, `model: "Assess.Assessment"`, and `modelId: 2`.
2. Observe the response content array.

**Expected Results:**
- The response contains exactly one content item of type `"text"`.
- The text begins with `"Error:"` followed by a descriptive message.
- `isError` is `true`.
- No credential values appear in the returned text.

---

### Scenario 5: Handle GraphQL mutation returning a failure response

**Steps:**
1. Call `add_task_to_activity` with valid credentials, `activityId: 99`, `model: "Story.Topic"`, and `modelId: 99` where the backend returns `{ success: false, message: "Activity not found" }`.
2. Observe the response content array.

**Expected Results:**
- The response contains exactly one content item of type `"text"`.
- The text is valid JSON with `success` set to `false`.
- The `message` field contains the server-provided reason (e.g., `"Activity not found"`).
- `isError` is absent or `false` (the tool treats this as a successful round-trip).

---

### Scenario 6: Handle network or unexpected runtime error

**Steps:**
1. Simulate a network timeout or thrown exception during `client.request(...)`.
2. Call `add_task_to_activity` with otherwise valid parameters.
3. Observe the response content array.

**Expected Results:**
- The response contains exactly one content item of type `"text"`.
- The text begins with `"Error:"` followed by the exception's message string.
- `isError` is `true`.

## Security Notes

- `apikey` values passed as parameters must never be logged, echoed in responses, or included in error messages.
- Authentication is delegated to `createAuthenticatedClient`; the tool itself performs no credential validation logic.
- Only users with admin or coordinator roles are permitted to invoke this mutation; enforcement is expected at the API/backend layer.
- Input parameters are validated via Zod schemas before any network call is made, reducing injection risk.

## Dependencies

- `zod` — runtime schema validation for all input parameters.
- `@modelcontextprotocol/sdk/server/mcp.js` — MCP server registration and tool interface.
- `../../libs/auth-helper.js` (`createAuthenticatedClient`) — authenticated GraphQL client factory.
- Backend GraphQL API — must expose the `addTaskToActivity(input: AddTaskInput!)` mutation returning `{ success, message }`.