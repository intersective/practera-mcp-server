# Search Project Briefs Tool

<!-- module: app/search-project-briefs / type: mcp-tool / status: draft -->

## Overview

The `mcp_practera_search_project_briefs` tool registers a skill-based search capability on an MCP server, allowing callers to query project briefs by a skill keyword. It uses a skill thesaurus and word stemming to broaden matches beyond exact string equality, identifying both technical and professional skill matches within each result. Results are returned as a structured JSON payload that includes the search term, related thesaurus terms, the stemmed form of the query, and per-brief match details. When no briefs match the query, a plain-text "not found" message is returned instead. A set of hardcoded sample project briefs is available in-process as a fallback reference, though the primary data source is the `projectBriefService`.

## Acceptance Criteria

1. The tool is registered under the name `mcp_practera_search_project_briefs` with a description of "Search for project briefs that match a specific skill".
2. The `skill` parameter is required and must be a non-empty string.
3. The `limit` parameter is optional, defaults to `5`, and is constrained to the range `[1, 20]`.
4. When matching briefs are found, the response content is a single `text` item containing valid JSON with the keys `search_term`, `search_details`, `total_results`, and `results`.
5. Each entry in `results` includes `project_title`, `industry`, `project_type`, `duration_weeks`, `technical_skills`, `professional_skills`, `matching_technical_skills`, and `matching_professional_skills`.
6. `matching_technical_skills` and `matching_professional_skills` contain only skills from the respective full lists that match the query via substring, stemmed-substring, or thesaurus-related-term comparison.
7. `search_details` contains `related_terms` (deduplicated array from thesaurus lookup) and `stemmed_form` (the stemmed, lowercased query).
8. When zero briefs are returned, the response content is a single `text` item with the message `No project briefs found matching the skill "<skill>".` and `isError` is not set.
9. When an unexpected error occurs, the response sets `isError: true` and the `text` content begins with `Error searching project briefs:` followed by the error message.
10. The `limit` value passed to the underlying service matches the caller-supplied value or `5` when omitted.

## Scenarios

### Scenario 1: Successful search with matching results

**Steps:**
1. Call the tool `mcp_practera_search_project_briefs` with `{ skill: "Python", limit: 3 }`.
2. Await the returned `ToolResult`.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- Parsing the `text` value as JSON succeeds without error.
- The parsed object has `search_term` equal to `"Python"`.
- `total_results` is a positive integer not exceeding `3`.
- `results` is an array whose length equals `total_results`.
- Each element of `results` contains the keys `project_title`, `industry`, `project_type`, `duration_weeks`, `technical_skills`, `professional_skills`, `matching_technical_skills`, and `matching_professional_skills`.
- `matching_technical_skills` for each result is a subset of that result's `technical_skills`.
- `search_details.stemmed_form` is a non-empty string.
- `isError` is absent or falsy.

### Scenario 2: Search with default limit

**Steps:**
1. Call the tool `mcp_practera_search_project_briefs` with `{ skill: "Communication" }` (no `limit` provided).
2. Await the returned `ToolResult`.

**Expected Results:**
- The response contains one content item with `type` equal to `"text"`.
- If results are found, `total_results` is at most `5`.
- The underlying service is invoked with a limit argument of `5`.

### Scenario 3: Search returns no matching briefs

**Steps:**
1. Call the tool `mcp_practera_search_project_briefs` with `{ skill: "zzznomatchskillxxx", limit: 5 }`.
2. Await the returned `ToolResult`.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` value equals `No project briefs found matching the skill "zzznomatchskillxxx".`.
- `isError` is absent or falsy.

### Scenario 4: Thesaurus-expanded matching populates related_terms

**Steps:**
1. Call the tool with `{ skill: "JavaScript", limit: 5 }`.
2. Await the returned `ToolResult`.
3. Parse the JSON from the `text` content field.

**Expected Results:**
- `search_details.related_terms` is an array (may be empty if no thesaurus entries match).
- All entries in `related_terms` are unique strings (no duplicates).
- `search_details.stemmed_form` is a non-empty lowercase string.

### Scenario 5: Limit boundary validation — value above maximum rejected

**Steps:**
1. Attempt to call the tool `mcp_practera_search_project_briefs` with `{ skill: "Python", limit: 21 }`.

**Expected Results:**
- The MCP framework rejects the call with a validation error before the handler executes (limit must be ≤ 20).

### Scenario 6: Limit boundary validation — value below minimum rejected

**Steps:**
1. Attempt to call the tool `mcp_practera_search_project_briefs` with `{ skill: "Python", limit: 0 }`.

**Expected Results:**
- The MCP framework rejects the call with a validation error before the handler executes (limit must be ≥ 1).

### Scenario 7: Service throws an unexpected error

**Steps:**
1. Configure `projectBriefService.searchBySkill` to throw a runtime `Error` with message `"Database unavailable"`.
2. Call the tool with `{ skill: "Python", limit: 2 }`.
3. Await the returned `ToolResult`.

**Expected Results:**
- The response contains exactly one content item with `type` equal to `"text"`.
- The `text` value starts with `Error searching project briefs: Database unavailable`.
- `isError` is `true`.

### Scenario 8: Matching skills are correctly identified per brief

**Steps:**
1. Call the tool with `{ skill: "Data Analysis", limit: 5 }`.
2. Await the returned `ToolResult`.
3. Parse the JSON from the `text` content field.
4. Locate the result entry whose `project_title` is `"Data Analysis for Sustainability"` (if present).

**Expected Results:**
- `matching_technical_skills` for that entry contains `"Data Analysis"`.
- `matching_technical_skills` is a strict subset of `technical_skills` for that entry.
- `matching_professional_skills` contains only skills from `professional_skills` that satisfy the match criteria.

## Security Notes

- No credentials, API keys, or tokens are present in this source file; none are transmitted by this tool.
- The `skill` input is used only for string comparison and thesaurus lookup; it is not interpolated into any query language or shell command, reducing injection risk.
- Error messages surfaced to callers include the raw exception message; care should be taken that internal service errors do not leak sensitive infrastructure details through this field.

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server registration (`McpServer`, `server.tool`).
- `zod` — Runtime schema validation for `skill` (string) and `limit` (number, min 1, max 20).
- `../libs/project-brief-service` — `projectBriefService.searchBySkill(skill, limit)` and the `ProjectBrief` type.
- `./get-project` — `ToolResult` type definition.
- `../libs/search-utils` — `getSkillThesaurus()` and `stemWord()` utilities used for query expansion and normalisation.