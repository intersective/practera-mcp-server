# List Pending Reviews Tool

<!-- module: app/reviewer/list-pending-reviews / type: tool / status: draft -->

## Overview

The `list_pending_reviews` tool registers an MCP server tool named `list_pending_reviews` that retrieves all assessment submissions currently in a `pending` review status for the authenticated reviewer. It accepts optional authentication parameters (`apikey`, `email`, `region`) and uses them to create an authenticated API client. The tool issues a GraphQL query against the API and returns the resulting review records serialised as a JSON string. On failure, the tool returns an error message with `isError: true` rather than throwing.

## Acceptance Criteria

- AC1: The tool is registered on the MCP server under the exact name `list_pending_reviews`.
- AC2: The tool accepts three optional input parameters: `apikey` (string), `email` (string), and `region` (string).
- AC3: An authenticated client is created using whichever combination of `apikey`, `email`, and `region` is supplied (all may be omitted).
- AC4: The GraphQL query filters reviews by `status: "pending"` and returns `id`, `status`, and nested `submission` fields (`id`, `assessment.id`, `assessment.name`, `user.name`, `user.email`).
- AC5: On success, the tool returns a single `text` content item containing the `reviews` array pretty-printed as JSON (2-space indent).
- AC6: On any error, the tool returns a single `text` content item with the message prefixed by `"Error: "` and sets `isError: true`.
- AC7: Raw credential values supplied via `apikey` are never echoed back in any response payload.

## Scenarios

### Scenario 1: Successful retrieval of pending reviews with explicit credentials

**Steps:**
1. Invoke the `list_pending_reviews` tool with valid `apikey`, `email`, and `region` parameters (use placeholder/test values; do not use real secrets).
2. Observe the response returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field is a valid JSON string representing an array.
- Each element in the array contains the fields `id`, `status`, `submission.id`, `submission.assessment.id`, `submission.assessment.name`, `submission.user.name`, and `submission.user.email`.
- `isError` is absent or `false`.

### Scenario 2: Successful retrieval of pending reviews with no credentials supplied

**Steps:**
1. Invoke the `list_pending_reviews` tool with no parameters (all three optional fields omitted).
2. Observe the response returned by the tool.

**Expected Results:**
- The authenticated client is created without explicit credentials (relies on environment/default auth).
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field is a valid JSON string (array, possibly empty).
- `isError` is absent or `false`.

### Scenario 3: Authentication failure

**Steps:**
1. Invoke the `list_pending_reviews` tool with an `apikey` value that causes `createAuthenticatedClient` to throw an error.
2. Observe the response returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field begins with the prefix `"Error: "` followed by the error message string.
- `isError` is `true`.
- The raw `apikey` value is not present anywhere in the response text.

### Scenario 4: GraphQL query failure after successful authentication

**Steps:**
1. Invoke the `list_pending_reviews` tool with credentials that authenticate successfully but cause the downstream `client.request` call to throw an error (e.g., network timeout or API error).
2. Observe the response returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field begins with `"Error: "` followed by the error's message property.
- `isError` is `true`.

### Scenario 5: Empty pending reviews list

**Steps:**
1. Invoke the `list_pending_reviews` tool with valid credentials against an API that returns an empty `reviews` array.
2. Observe the response returned by the tool.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` field is the string `"[]"` (empty JSON array, pretty-printed).
- `isError` is absent or `false`.

## Security Notes

- The `apikey` parameter must never be logged, echoed in responses, or included in error messages.
- All credential parameters (`apikey`, `email`, `region`) are passed only to `createAuthenticatedClient` and are not stored or returned by the tool.
- Input validation is enforced by Zod schema (all fields must be strings when provided); non-string values are rejected before the tool handler executes.

## Dependencies

- `zod` — input schema validation for tool parameters.
- `@modelcontextprotocol/sdk/server/mcp.js` (`McpServer`) — MCP server registration interface.
- `../../libs/auth-helper` (`createAuthenticatedClient`) — constructs an authenticated API client from optional credential parameters.
- Downstream GraphQL API — must support the `reviews(status: "pending")` query with the specified selection set.