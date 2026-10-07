# Import Experience Tool

<!-- module: app/author/import-experience / type: tool / status: draft / feature: design.experience.import-json-->

## Overview

The Import Experience tool registers an MCP server tool (`import_experience`) that bulk-imports experience content — including milestones, activities, and assessments — from a Practera-format JSON export into an existing target experience. It authenticates via an API key, email, and region before executing a GraphQL mutation (`importExperienceData`) against the Practera API. The tool accepts the target experience UUID and a stringified JSON payload, then returns the mutation result indicating success or failure. Access requires admin role or a local environment. All authentication credentials are optional parameters resolved at runtime.

## Acceptance Criteria

- AC-1: The tool is registered on the MCP server under the name `import_experience`.
- AC-2: The tool accepts `experienceUuid` (required string) and `data` (required stringified JSON string) as inputs.
- AC-3: The tool accepts optional `apikey`, `email`, and `region` parameters for authentication.
- AC-4: On success, the tool returns a JSON-formatted text response containing `experienceUuid`, `success`, and `message` fields from the mutation response.
- AC-5: On any error (authentication failure, network error, GraphQL error), the tool returns a text response prefixed with `Error:` and sets `isError: true`.
- AC-6: Raw credential values (API keys, tokens) are never exposed in output or logs.

## Scenarios

### Scenario 1: Successful bulk import with valid credentials and payload

**Steps:**
1. Call the `import_experience` tool with a valid `apikey`, `email`, `region`, a known `experienceUuid`, and a valid Practera-format stringified JSON string as `data`.
2. Observe the response returned by the tool.

**Expected Results:**
- The response `content` array contains exactly one item of type `text`.
- The `text` value is a JSON string parseable to an object containing `experienceUuid`, `success` (boolean), and `message` (string) fields.
- `success` is `true`.
- `isError` is not set or is `false`.

### Scenario 2: Import with missing optional authentication parameters

**Steps:**
1. Call the `import_experience` tool omitting `apikey`, `email`, and `region`, providing only a valid `experienceUuid` and `data`.
2. Observe the response returned by the tool.

**Expected Results:**
- The tool does not throw an unhandled exception.
- The response is either a valid success payload or an error response with `isError: true` and a message beginning with `Error:`, depending on the authentication outcome of `createAuthenticatedClient` with undefined credentials.

### Scenario 3: Import fails due to invalid or unauthorised credentials

**Steps:**
1. Call the `import_experience` tool with an invalid or unauthorised `apikey` and a valid `experienceUuid` and `data`.
2. Observe the response returned by the tool.

**Expected Results:**
- The response `content` array contains exactly one item of type `text`.
- The `text` value begins with `Error:` followed by a descriptive error message.
- `isError` is `true`.
- No raw credential values appear in the returned `text`.

### Scenario 4: Import fails due to malformed JSON in `data` parameter

**Steps:**
1. Call the `import_experience` tool with valid credentials, a valid `experienceUuid`, and a `data` value that is not valid JSON (e.g., `"not-json"`).
2. Observe the response returned by the tool.

**Expected Results:**
- The response `content` array contains exactly one item of type `text`.
- The `text` value begins with `Error:` followed by a descriptive error message.
- `isError` is `true`.

### Scenario 5: GraphQL mutation returns a failure result

**Steps:**
1. Call the `import_experience` tool with valid credentials, a `experienceUuid` that exists but causes a business-logic failure (e.g., incompatible data schema), and a syntactically valid `data` string.
2. Observe the response returned by the tool.

**Expected Results:**
- The response `content` array contains exactly one item of type `text`.
- The `text` value is a JSON string containing `success: false` and a non-empty `message` describing the failure.
- `isError` is not set or is `false` (the tool returns the API's own failure payload rather than a caught exception).

## Security Notes

- `apikey`, `email`, and `region` parameters are marked optional and passed directly to `createAuthenticatedClient`; raw values must never be logged or included in tool output.
- The tool description states it requires admin role or a local environment; enforcement of this constraint is delegated to the authenticated API layer and is not validated client-side within this tool.
- The `data` parameter accepts arbitrary stringified JSON; consumers should validate and sanitise the payload before passing it to this tool to prevent injection of unexpected content into the target experience.

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server and tool registration (`McpServer`).
- `zod` — Runtime schema validation for tool input parameters.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — Authenticated GraphQL client construction using provided credentials.
- Practera GraphQL API — Exposes the `importExperienceData` mutation consumed by this tool.