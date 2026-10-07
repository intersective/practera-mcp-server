# Create Milestone Tool

<!-- module: app/author/create-milestone / type: tool / status: draft / feature: design.structure.milestone-crud-->

## Overview

The `create_milestone` tool registers an MCP server action that creates a milestone (stage) inside an existing project via a GraphQL mutation. It requires the caller to supply a valid project ID and milestone name, and optionally a description and display order. Authentication is performed using an API key and/or email credential resolved at call time. Only users with an admin or coordinator role are permitted to create milestones.

## Acceptance Criteria

1. The tool is registered on the MCP server under the name `create_milestone`.
2. `projectId` (number) and `name` (string) are required parameters; `description`, `order`, `apikey`, `email`, and `region` are optional.
3. On success, the tool returns a JSON-formatted text payload containing the `id` and `name` of the newly created milestone.
4. On failure (authentication error, network error, GraphQL error, or missing permissions), the tool returns a response with `isError: true` and a human-readable error message prefixed with `Error:`.
5. Credentials (`apikey`, `email`, `region`) are passed to `createAuthenticatedClient` and are never echoed back in the response payload.
6. The `order` parameter, when supplied, controls the 0-based display order of the milestone within the project.

## Scenarios

### Scenario 1: Successful milestone creation with required fields only

**Steps:**
1. Invoke the `create_milestone` tool with `projectId: 42` and `name: "Alpha Release"`, omitting all optional parameters.
2. Observe the HTTP/GraphQL request sent to the API endpoint.
3. Observe the tool response object.

**Expected Results:**
- The GraphQL mutation `createMilestone` is called with `input: { projectId: 42, name: "Alpha Release", description: undefined, order: undefined }`.
- The response `content` array contains exactly one item of `type: "text"`.
- The `text` field is a valid JSON string containing `id` and `name` fields matching the created milestone.
- `isError` is absent or `false` on the response object.

---

### Scenario 2: Successful milestone creation with all optional fields

**Steps:**
1. Invoke the `create_milestone` tool with `projectId: 7`, `name: "Beta Stage"`, `description: "Second phase"`, `order: 1`, `apikey: <REDACTED>`, `email: <REDACTED>`, and `region: "us-east"`.
2. Observe the GraphQL mutation variables forwarded to the API.
3. Observe the tool response object.

**Expected Results:**
- The mutation input includes `{ projectId: 7, name: "Beta Stage", description: "Second phase", order: 1 }`.
- The `apikey`, `email`, and `region` values are passed only to `createAuthenticatedClient` and do not appear in the returned `text` payload.
- The response `content[0].text` is a JSON string with `id` and `name` of the created milestone.
- `isError` is absent or `false`.

---

### Scenario 3: Authentication failure

**Steps:**
1. Configure `createAuthenticatedClient` to throw an `Error` with message `"Unauthorized"`.
2. Invoke the `create_milestone` tool with `projectId: 1` and `name: "Milestone X"`.
3. Observe the tool response object.

**Expected Results:**
- The response `content` array contains exactly one item of `type: "text"`.
- The `text` field equals `"Error: Unauthorized"`.
- The response includes `isError: true`.

---

### Scenario 4: GraphQL mutation returns an error

**Steps:**
1. Configure the authenticated client's `request` method to throw an `Error` with message `"Permission denied"`.
2. Invoke the `create_milestone` tool with `projectId: 5` and `name: "Restricted Milestone"`.
3. Observe the tool response object.

**Expected Results:**
- The response `content[0].text` equals `"Error: Permission denied"`.
- The response includes `isError: true`.

---

### Scenario 5: Non-Error exception is thrown

**Steps:**
1. Configure the authenticated client's `request` method to throw a plain string `"unexpected failure"` (not an `Error` instance).
2. Invoke the `create_milestone` tool with `projectId: 3` and `name: "Edge Case Milestone"`.
3. Observe the tool response object.

**Expected Results:**
- The response `content[0].text` equals `"Error: unexpected failure"`.
- The response includes `isError: true`.

---

### Scenario 6: Tool registration on MCP server

**Steps:**
1. Instantiate an MCP server instance.
2. Call `registerCreateMilestoneTool(server)`.
3. Query the server's registered tools list.

**Expected Results:**
- A tool named `create_milestone` is present in the server's tool registry.
- The tool description reads `"Create a milestone (stage) inside a project. Requires admin or coordinator role."`.
- The tool schema marks `projectId` and `name` as required and all other parameters as optional.

## Security Notes

- API key and email credentials supplied via `apikey` and `email` parameters must be forwarded exclusively to `createAuthenticatedClient` and must never appear in tool response payloads or logs.
- Raw credential values must be redacted in any specification, log output, or test fixture.
- The tool description explicitly states that admin or coordinator role is required; enforcement is expected server-side via the GraphQL API.
- Error messages returned to the caller must not expose internal stack traces or raw credential values.

## Dependencies

- `zod` — parameter schema validation and type coercion.
- `@modelcontextprotocol/sdk/server/mcp.js` — MCP server and tool registration interface (`McpServer`).
- `../../libs/auth-helper.js` — `createAuthenticatedClient` factory responsible for credential resolution and authenticated GraphQL client construction.
- GraphQL API endpoint — must support the `createMilestone(input: CreateMilestoneInput!)` mutation returning `id` and `name`.