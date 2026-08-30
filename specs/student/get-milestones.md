# Get Milestones Tool

<!-- module: app/student/get-milestones / type: tool / status: draft -->

## Overview

The `get_milestones` tool is an MCP server tool that retrieves all milestones and their associated activities for the currently authenticated user's enrolled project. It is registered under the tool name `get_milestones` and communicates with a backend GraphQL API via an authenticated client. The tool accepts optional authentication parameters (`apikey`, `email`, `region`) to override default credentials or region settings. Results are returned as a JSON-formatted text payload representing the project's milestone hierarchy. On failure, the tool returns an error message and sets the `isError` flag to `true`.

## Acceptance Criteria

1. The tool MUST be registered on the MCP server with the exact name `get_milestones`.
2. The tool MUST accept three optional input parameters: `apikey` (string), `email` (string), and `region` (string).
3. The tool MUST create an authenticated client using the provided `apikey`, `email`, and `region` parameters (or their defaults when omitted).
4. The tool MUST execute a GraphQL query that retrieves the project's `id`, `name`, and its milestones, where each milestone includes `id`, `name`, `description`, `isLocked`, and a list of activities each containing `id`, `name`, `description`, and `isLocked`.
5. On success, the tool MUST return a single `text` content item containing the project object serialised as pretty-printed JSON (2-space indent).
6. On failure, the tool MUST return a single `text` content item whose text begins with `Error:` followed by the error message, and MUST set `isError: true` on the response.
7. Raw credential values passed as `apikey` MUST NOT be echoed back in any response payload beyond what the authenticated client requires internally.

## Scenarios

### Scenario 1: Successful retrieval of milestones with default credentials

**Steps:**
1. Invoke the `get_milestones` tool without providing `apikey`, `email`, or `region` parameters.
2. Observe that `createAuthenticatedClient` is called with `{ apikey: undefined, email: undefined, region: undefined }`.
3. Observe that the GraphQL query sent to the client matches the `GetMilestones` query shape (requesting `project.id`, `project.name`, `project.milestones[].id/name/description/isLocked`, and `project.milestones[].activities[].id/name/description/isLocked`).
4. Receive a mocked successful response containing a project with at least one milestone and one activity.

**Expected Results:**
- The tool response contains exactly one content item with `type` equal to `"text"`.
- The `text` field is valid JSON that, when parsed, equals the `project` object from the GraphQL response.
- The JSON is formatted with 2-space indentation.
- `isError` is absent or `false` on the response object.

### Scenario 2: Successful retrieval with explicit credentials and region

**Steps:**
1. Invoke the `get_milestones` tool providing `apikey: "[REDACTED]"`, `email: "student@example.com"`, and `region: "eu-west-1"`.
2. Observe that `createAuthenticatedClient` is called with `{ apikey: "[REDACTED]", email: "student@example.com", region: "eu-west-1" }`.
3. Receive a mocked successful response containing a project object.

**Expected Results:**
- The tool response contains exactly one content item with `type` equal to `"text"`.
- The `text` field is valid JSON representing the project object.
- The raw `apikey` value is not present anywhere in the returned `text` content.

### Scenario 3: Authentication failure

**Steps:**
1. Configure `createAuthenticatedClient` to throw an `Error` with message `"Invalid API key"`.
2. Invoke the `get_milestones` tool with any parameters.

**Expected Results:**
- The tool response contains exactly one content item with `type` equal to `"text"`.
- The `text` field equals `"Error: Invalid API key"`.
- The response object has `isError: true`.

### Scenario 4: GraphQL request failure

**Steps:**
1. Configure `createAuthenticatedClient` to return a client whose `request` method throws an `Error` with message `"Network timeout"`.
2. Invoke the `get_milestones` tool with any parameters.

**Expected Results:**
- The tool response contains exactly one content item with `type` equal to `"text"`.
- The `text` field equals `"Error: Network timeout"`.
- The response object has `isError: true`.

### Scenario 5: Non-Error exception thrown during request

**Steps:**
1. Configure the authenticated client's `request` method to throw a plain string value `"unexpected failure"` (not an `Error` instance).
2. Invoke the `get_milestones` tool with any parameters.

**Expected Results:**
- The tool response contains exactly one content item with `type` equal to `"text"`.
- The `text` field equals `"Error: unexpected failure"`.
- The response object has `isError: true`.

## Security Notes

- The `apikey` parameter is treated as a sensitive credential. It MUST be redacted in any logging, tracing, or specification output and MUST NOT appear in tool response payloads.
- Authentication is delegated entirely to `createAuthenticatedClient`; the tool itself performs no credential validation or storage.
- The tool passes caller-supplied strings directly to `createAuthenticatedClient` without sanitisation; the auth helper is responsible for validating and safely handling these values.

## Dependencies

- `zod` — runtime schema validation for tool input parameters.
- `@modelcontextprotocol/sdk/server/mcp` — MCP server and tool registration interface (`McpServer`).
- `../../libs/auth-helper` (`createAuthenticatedClient`) — constructs an authenticated GraphQL client from optional `apikey`, `email`, and `region` parameters.
- Backend GraphQL API — must expose a `project` query root field returning the milestone and activity structure described in the acceptance criteria.