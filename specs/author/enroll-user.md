# Enroll User Tool

<!-- module: app/author/enroll-user / type: tool / status: draft / feature: source.enrol.single-user-->

## Overview

The `enroll_user` MCP tool allows an authenticated caller to enroll a specified user into a target experience with a designated role. It is exposed via the MCP server and requires the caller to hold an admin or coordinator role. Authentication is established through an API key or a developer login email, with an optional region parameter. The tool issues a `EnrollUser` GraphQL mutation and returns a structured success/message response. Errors encountered during authentication or mutation execution are surfaced as error-flagged text responses.

## Acceptance Criteria

1. The tool is registered on the MCP server under the name `enroll_user`.
2. `userEmail`, `role`, and `experienceUuid` are required input parameters; `apikey`, `email`, and `region` are optional.
3. `role` must be one of the enumerated values: `participant`, `mentor`, `coordinator`, or `admin`; any other value is rejected at input validation.
4. On success, the tool returns a JSON-formatted text payload containing the `success` and `message` fields from the `enrollUser` mutation response.
5. On failure (authentication error, network error, or GraphQL error), the tool returns a text response prefixed with `Error:` and sets `isError: true`.
6. API keys and raw credentials are never echoed back in any response payload.

## Scenarios

### Scenario 1: Successful enrollment with valid inputs

**Steps:**
1. Invoke the `enroll_user` tool with a valid `apikey` (or `email` for devLogin), a valid `experienceUuid`, a valid `userEmail`, and `role` set to `participant`.
2. Observe the HTTP/GraphQL request sent to the authenticated client.
3. Observe the tool's returned `content` array.

**Expected Results:**
- The GraphQL mutation `EnrollUser` is called with `input.email`, `input.role`, and `input.experienceUuid` matching the provided parameters.
- The returned `content` contains exactly one item of type `text`.
- The text value is a pretty-printed JSON object containing `success` (boolean) and `message` (string) fields.
- `isError` is absent or `false`.

### Scenario 2: Enrollment with each valid role value

**Steps:**
1. Invoke the `enroll_user` tool four times, each time with a different `role` value: `participant`, `mentor`, `coordinator`, `admin`.
2. Observe the input validation result for each invocation.

**Expected Results:**
- All four invocations pass input validation without error.
- Each invocation dispatches the mutation with the corresponding `role` value in the `input` payload.

### Scenario 3: Rejection of an invalid role value

**Steps:**
1. Invoke the `enroll_user` tool with `role` set to a value not in the enum, e.g., `"observer"`.
2. Observe the tool's response.

**Expected Results:**
- Input validation fails before any authenticated client is created.
- The tool does not dispatch a GraphQL mutation.
- An error response is returned indicating the invalid role value.

### Scenario 4: Authentication failure

**Steps:**
1. Invoke the `enroll_user` tool with an invalid or expired `apikey` and valid values for `userEmail`, `role`, and `experienceUuid`.
2. Observe the tool's returned `content` array.

**Expected Results:**
- The returned `content` contains exactly one item of type `text`.
- The text value begins with the prefix `Error:` followed by the error message.
- The response includes `isError: true`.
- No credential values appear in the error text.

### Scenario 5: GraphQL mutation returns an error

**Steps:**
1. Invoke the `enroll_user` tool with a valid `apikey` but a non-existent `experienceUuid`.
2. Observe the tool's returned `content` array.

**Expected Results:**
- The returned `content` contains exactly one item of type `text`.
- The text value begins with `Error:` and includes the error message thrown by the GraphQL client.
- The response includes `isError: true`.

### Scenario 6: Optional region parameter is forwarded to the authenticated client

**Steps:**
1. Invoke the `enroll_user` tool with a valid `apikey`, valid required fields, and `region` set to a specific region string (e.g., `"eu-west-1"`).
2. Observe the arguments passed to `createAuthenticatedClient`.

**Expected Results:**
- `createAuthenticatedClient` is called with `region` equal to the provided region string.
- The mutation is dispatched to the client configured for that region.

## Security Notes

- The `apikey` parameter must never be logged, echoed in responses, or included in error messages.
- The `email` parameter used for `devLogin` must not appear in any tool response payload.
- Input validation via Zod schema is enforced before any authenticated client is instantiated, preventing unnecessary credential use on malformed requests.
- The tool description explicitly states that admin or coordinator role is required; enforcement of this constraint is expected to occur server-side within the GraphQL API.

## Dependencies

- `zod` — runtime input schema validation and type inference.
- `@modelcontextprotocol/sdk/server/mcp.js` — MCP server registration and tool invocation framework.
- `../../libs/auth-helper.js` (`createAuthenticatedClient`) — constructs an authenticated GraphQL client from API key, email, and region parameters.
- GraphQL API endpoint — must expose the `EnrollUser` mutation accepting `EnrollUserInput` with fields `email`, `role`, and `experienceUuid`, and returning `success` and `message`.