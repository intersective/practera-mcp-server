# Practera MCP Resources

<!-- module: app/practera-resources / type: feature / status: draft / feature: source.library.mcp-resources-->

## Overview

This module registers three MCP (Model Context Protocol) resources with the MCP server under the `practera://` URI scheme: a static current-project resource, a parameterised assessment resource, and a parameterised project-brief resource. The current-project and assessment resources retrieve data by executing GraphQL queries against the Practera API via a shared GraphQL client. The project-brief resource retrieves data from an in-process `projectBriefService` rather than via GraphQL. All three resources return their payloads as JSON-formatted text with MIME type `application/json`. Region and API key values are currently hard-coded defaults pending full client-context propagation.

## Acceptance Criteria

1. Registering the module with an MCP server exposes exactly three named resources: `currentProject`, `assessments`, and `briefs`.
2. `GET practera://project/current` returns a JSON body containing project `id`, `name`, `milestones`, nested `activities`, and nested `tasks`.
3. `GET practera://assessments/{assessmentId}` returns a JSON body containing assessment `id`, `name`, `description`, `type`, `groups`, and nested `questions` when a valid integer `assessmentId` is supplied.
4. `GET practera://assessments/{assessmentId}` throws an error when `assessmentId` is absent or empty.
5. `GET practera://briefs/{briefId}` returns a JSON body matching the brief whose `project_title` equals `briefId`.
6. `GET practera://briefs/{briefId}` throws an error when no brief with the given `project_title` exists.
7. `GET practera://briefs/{briefId}` throws an error when `briefId` is absent or empty.
8. All three resources set `mimeType` to `"application/json"` and `uri` to the string form of the request URI in every successful response.
9. Any GraphQL or service error is caught, logged to `console.error`, and re-thrown as a descriptive `Error` instance.

## Scenarios

### Scenario 1: Fetch current project successfully

**Steps:**
1. Call `registerPracteraResources(server)` with a mock MCP server.
2. Invoke the `currentProject` resource handler with URI `practera://project/current`.
3. Mock `createGraphQLClient` to return a client whose `request` method resolves with `{ project: { id: 1, name: "Test", milestones: [] } }`.

**Expected Results:**
- The handler resolves without throwing.
- The returned object has `contents` array of length 1.
- `contents[0].uri` equals `"practera://project/current"`.
- `contents[0].mimeType` equals `"application/json"`.
- `contents[0].text` is valid JSON containing `project.id` equal to `1`.

---

### Scenario 2: GraphQL error on current project fetch

**Steps:**
1. Call `registerPracteraResources(server)` with a mock MCP server.
2. Invoke the `currentProject` resource handler with URI `practera://project/current`.
3. Mock `createGraphQLClient` to return a client whose `request` method rejects with `new Error("Network failure")`.

**Expected Results:**
- The handler throws an `Error`.
- The error message contains the substring `"Failed to fetch project"`.
- `console.error` is called once with the URI and the original error.

---

### Scenario 3: Fetch assessment by valid ID

**Steps:**
1. Call `registerPracteraResources(server)` with a mock MCP server.
2. Invoke the `assessments` resource handler with URI `practera://assessments/42` and variables `{ assessmentId: "42" }`.
3. Mock `createGraphQLClient` to return a client whose `request` method resolves with `{ assessment: { id: 42, name: "Quiz", groups: [] } }`.

**Expected Results:**
- The handler resolves without throwing.
- `contents[0].uri` equals `"practera://assessments/42"`.
- `contents[0].mimeType` equals `"application/json"`.
- `contents[0].text` is valid JSON containing `assessment.id` equal to `42`.
- The GraphQL client's `request` is called with variables `{ id: 42 }` (integer, not string).

---

### Scenario 4: Fetch assessment with missing ID

**Steps:**
1. Call `registerPracteraResources(server)` with a mock MCP server.
2. Invoke the `assessments` resource handler with URI `practera://assessments/` and variables `{ assessmentId: "" }`.

**Expected Results:**
- The handler throws an `Error`.
- The error message equals `"Assessment ID is required"`.

---

### Scenario 5: Fetch project brief by valid title

**Steps:**
1. Call `registerPracteraResources(server)` with a mock MCP server.
2. Mock `projectBriefService.initialize` to resolve immediately.
3. Mock `projectBriefService.getAllBriefs` to resolve with `[{ project_title: "Alpha", description: "Desc" }]`.
4. Invoke the `briefs` resource handler with URI `practera://briefs/Alpha` and variables `{ briefId: "Alpha" }`.

**Expected Results:**
- The handler resolves without throwing.
- `contents[0].uri` equals `"practera://briefs/Alpha"`.
- `contents[0].mimeType` equals `"application/json"`.
- `contents[0].text` is valid JSON containing `project_title` equal to `"Alpha"`.

---

### Scenario 6: Fetch project brief with non-existent title

**Steps:**
1. Call `registerPracteraResources(server)` with a mock MCP server.
2. Mock `projectBriefService.initialize` to resolve immediately.
3. Mock `projectBriefService.getAllBriefs` to resolve with `[{ project_title: "Alpha" }]`.
4. Invoke the `briefs` resource handler with URI `practera://briefs/Beta` and variables `{ briefId: "Beta" }`.

**Expected Results:**
- The handler throws an `Error`.
- The error message contains `"Beta"` and `"not found"`.

---

### Scenario 7: Fetch project brief with missing ID

**Steps:**
1. Call `registerPracteraResources(server)` with a mock MCP server.
2. Invoke the `briefs` resource handler with URI `practera://briefs/` and variables `{ briefId: "" }`.

**Expected Results:**
- The handler throws an `Error`.
- The error message equals `"Brief ID is required"`.

---

### Scenario 8: Service error on project brief fetch

**Steps:**
1. Call `registerPracteraResources(server)` with a mock MCP server.
2. Mock `projectBriefService.initialize` to reject with `new Error("Storage unavailable")`.
3. Invoke the `briefs` resource handler with URI `practera://briefs/Alpha` and variables `{ briefId: "Alpha" }`.

**Expected Results:**
- The handler throws an `Error`.
- The error message contains the substring `"Failed to fetch project brief Alpha"`.
- `console.error` is called once with the URI and the original error.

## Security Notes

- API key values are currently empty strings hard-coded in the source; no credentials are exposed in this specification. When real API keys are introduced they must be sourced from a secure client-context mechanism and must never be logged or included in error messages.
- The `assessmentId` variable is parsed with `parseInt` before being passed to GraphQL, which prevents string injection into the integer-typed GraphQL variable; however, callers should validate that the result is a finite integer before use.
- No authentication or authorisation check is performed at the resource-handler level; access control must be enforced by the MCP server layer or an upstream gateway.

## Dependencies

| Dependency | Role |
|---|---|
| `@modelcontextprotocol/sdk` (`McpServer`, `ResourceTemplate`) | MCP server registration and URI templating |
| `../libs/graphql-client` (`createGraphQLClient`) | Constructs authenticated GraphQL clients for Practera API calls |
| `../libs/project-brief-service` (`projectBriefService`) | In-process service for loading and querying project briefs |