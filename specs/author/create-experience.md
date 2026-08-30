# Create Experience Tool

<!-- module: app/author/create-experience / type: tool / status: draft -->

## Overview

The `create_experience` tool registers an MCP server action that creates a new experience (program) within a specified institution via a GraphQL mutation. It requires an authenticated client, obtained either through a Practera JWT API key or a developer login flow for local and staging environments. The tool accepts required fields (`name`, `institutionUuid`) and optional fields (`description`, `type`) to configure the new experience. On success it returns the created experience's `id`, `name`, and `uuid` as a JSON-formatted text response. On failure it returns an error message and sets the `isError` flag. Admin role is required to invoke this tool.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the name `create_experience`.
- AC2: `name` and `institutionUuid` are required parameters; the tool must reject invocations that omit either.
- AC3: `apikey`, `email`, `region`, `description`, and `type` are optional parameters.
- AC4: When authentication succeeds and the GraphQL mutation returns data, the response content contains a single text item with the JSON representation of `createExperience` (`id`, `name`, `uuid`).
- AC5: When an error occurs (authentication failure, network error, or GraphQL error), the response sets `isError: true` and the content text begins with `Error:` followed by the error message.
- AC6: Raw API key or JWT values must never be logged or included in the tool's output.
- AC7: The `region` parameter controls which backend endpoint the authenticated client targets (e.g., `usa`, `aus`, `euk`, `stage`, `local`).

## Scenarios

### Scenario 1: Successful experience creation with API key

**Steps:**
1. Invoke `create_experience` with `apikey` set to a valid (redacted) JWT, `region` set to `"aus"`, `name` set to `"Test Program"`, and `institutionUuid` set to a valid UUID string.
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The text content is valid JSON parseable to an object containing `id`, `name`, and `uuid` fields.
- The `name` field in the parsed JSON equals `"Test Program"`.
- `isError` is not set to `true` on the response.

### Scenario 2: Successful experience creation using devLogin (no API key)

**Steps:**
1. Invoke `create_experience` with `email` set to a valid developer email, `region` set to `"local"`, `name` set to `"Dev Experience"`, and `institutionUuid` set to a valid UUID string; omit `apikey`.
2. Observe the response object returned by the tool.

**Expected Results:**
- The authenticated client is created via the devLogin path (no JWT provided).
- The response contains exactly one content item with `type` equal to `"text"`.
- The text content is valid JSON containing `id`, `name`, and `uuid`.
- `isError` is not set to `true` on the response.

### Scenario 3: Experience creation with optional fields

**Steps:**
1. Invoke `create_experience` with `apikey` (redacted), `region` set to `"usa"`, `name` set to `"Full Program"`, `institutionUuid` set to a valid UUID, `description` set to `"A detailed description"`, and `type` set to `"project"`.
2. Observe the GraphQL mutation input forwarded to the client and the response.

**Expected Results:**
- The mutation input includes `description` equal to `"A detailed description"` and `type` equal to `"project"`.
- The response content text is valid JSON with `id`, `name`, and `uuid` present.
- `isError` is not set to `true` on the response.

### Scenario 4: Missing required parameter `name`

**Steps:**
1. Invoke `create_experience` providing `institutionUuid` and `apikey` (redacted) but omitting `name`.
2. Observe the response or validation error.

**Expected Results:**
- The tool does not execute the GraphQL mutation.
- A validation error is raised or the response sets `isError: true`.
- The error message indicates that `name` is required.

### Scenario 5: Missing required parameter `institutionUuid`

**Steps:**
1. Invoke `create_experience` providing `name` and `apikey` (redacted) but omitting `institutionUuid`.
2. Observe the response or validation error.

**Expected Results:**
- The tool does not execute the GraphQL mutation.
- A validation error is raised or the response sets `isError: true`.
- The error message indicates that `institutionUuid` is required.

### Scenario 6: Authentication failure

**Steps:**
1. Invoke `create_experience` with an invalid or expired `apikey` (redacted placeholder), `region` set to `"usa"`, `name` set to `"Auth Fail Program"`, and `institutionUuid` set to a valid UUID.
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The text content starts with `"Error:"` followed by a non-empty error message.
- `isError` is set to `true` on the response.
- No JWT or credential value appears in the error text.

### Scenario 7: GraphQL mutation returns an error

**Steps:**
1. Invoke `create_experience` with valid authentication credentials (redacted), `name` set to `"Bad UUID Program"`, and `institutionUuid` set to a non-existent UUID.
2. Observe the response object returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The text content starts with `"Error:"` followed by the GraphQL error message.
- `isError` is set to `true` on the response.

## Security Notes

- The `apikey` parameter carries a Practera JWT and must be treated as a secret; it must never appear in logs, error messages, or tool output.
- The `email` parameter used for devLogin is restricted to local and staging environments (`local`, `stage` regions) and must not be used against production endpoints.
- Admin role enforcement is delegated to the backend GraphQL API; the tool itself does not perform role checks client-side.
- All credential values in tests and configuration must be stored in environment variables or secret stores and redacted from specifications and logs.

## Dependencies

- `zod` — runtime parameter schema validation.
- `@modelcontextprotocol/sdk/server/mcp.js` — MCP server and tool registration (`McpServer`).
- `../../libs/auth-helper` — `createAuthenticatedClient` factory responsible for JWT and devLogin authentication flows.
- Practera GraphQL API — backend endpoint that executes the `CreateExperience` mutation and enforces admin role authorisation.