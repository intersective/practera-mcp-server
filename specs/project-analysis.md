# Project Analysis Prompt Registration

<!-- module: app/project-analysis / type: feature / status: draft -->

## Overview

This feature registers a named MCP (Model Context Protocol) prompt called `project-analysis` on the MCP server, enabling clients to request structured analysis of Practera project data. When invoked, the prompt composes two user-role messages: a system-level expert persona instruction and a parameterised analysis request that embeds the caller-supplied project data. The analysis guidance directs the model to evaluate project structure, assessment design, and learning experience quality. An example response template is also exported to illustrate expected output format. The feature is implemented as a single registration function (`registerProjectPrompts`) that must be called with a live `McpServer` instance at startup.

## Acceptance Criteria

- AC1: The `project-analysis` prompt is registered on the MCP server with the exact name `"project-analysis"`.
- AC2: The prompt accepts exactly one input parameter named `projectData` validated as a non-empty string via Zod.
- AC3: Invoking the prompt produces a `messages` array containing exactly two entries, both with `role: "user"`.
- AC4: The first message contains the full expert persona and evaluation framework text (project structure, assessment design, learning experience sections).
- AC5: The second message embeds the caller-supplied `projectData` value within the `[PROJECT DATA]` section of the analysis request text.
- AC6: The second message instructs the model to analyse four specific dimensions: overall structure and flow, assessment strategy and balance, clarity of instructions, and potential improvements.
- AC7: Both message content objects carry `type: "text"`.
- AC8: `registerProjectPrompts` does not throw when called with a valid `McpServer` instance.

## Scenarios

### Scenario 1: Successful prompt registration at server startup

**Steps:**
1. Instantiate a valid `McpServer` object.
2. Call `registerProjectPrompts(server)`.
3. Query the server's registered prompts list for an entry named `"project-analysis"`.

**Expected Results:**
- The server's prompt registry contains exactly one entry with name `"project-analysis"`.
- The registered prompt description equals `"Analyze a Practera project structure and learning design"`.
- No exception is thrown during registration.

### Scenario 2: Prompt invocation with valid project data

**Steps:**
1. Register the prompt by calling `registerProjectPrompts(server)`.
2. Invoke the `project-analysis` prompt with `projectData` set to a non-empty JSON string representing a sample project (e.g., `'{"name":"Test Project","milestones":[]}'`).
3. Inspect the returned `messages` array.

**Expected Results:**
- The returned object contains a `messages` property that is an array of length 2.
- `messages[0].role` equals `"user"`.
- `messages[0].content.type` equals `"text"`.
- `messages[0].content.text` contains the substring `"experiential learning design and assessment"`.
- `messages[0].content.text` contains the substrings `"Project Structure"`, `"Assessment Design"`, and `"Learning Experience"`.
- `messages[1].role` equals `"user"`.
- `messages[1].content.type` equals `"text"`.
- `messages[1].content.text` contains the substring `"[PROJECT DATA]"`.
- `messages[1].content.text` contains the exact `projectData` string supplied by the caller.

### Scenario 3: Prompt invocation with empty string projectData is rejected by schema

**Steps:**
1. Register the prompt by calling `registerProjectPrompts(server)`.
2. Attempt to invoke the `project-analysis` prompt passing `projectData` as a value that does not satisfy `z.string()` (e.g., a numeric type or omitted field).

**Expected Results:**
- The MCP server returns a validation error or rejects the invocation before constructing messages.
- No `messages` array is returned to the caller.

### Scenario 4: projectData content is correctly interpolated into the second message

**Steps:**
1. Register the prompt by calling `registerProjectPrompts(server)`.
2. Invoke the prompt with `projectData` set to the string `"UNIQUE_MARKER_12345"`.
3. Read `messages[1].content.text` from the returned object.

**Expected Results:**
- `messages[1].content.text` contains the exact substring `"UNIQUE_MARKER_12345"`.
- `messages[1].content.text` does not appear in `messages[0].content.text`.

### Scenario 5: Example response export is available and well-formed

**Steps:**
1. Import `projectAnalysisExampleResponse` from the module.
2. Check the exported string value.

**Expected Results:**
- `projectAnalysisExampleResponse` is a non-empty string.
- The string contains the Markdown heading `"# Project Structure Analysis"`.
- The string contains the subsections `"## Strengths"`, `"## Areas for Improvement"`, and `"## Recommendations"`.

## Security Notes

- The `projectData` parameter is interpolated directly into the prompt text via a template literal. Callers must ensure that project data retrieved from the Practera API does not contain prompt-injection payloads before passing it to this prompt.
- No credentials, API keys, or tokens are present in this module.
- The module does not perform any network requests itself; data sourcing and authentication are the responsibility of the calling layer.

## Dependencies

- `zod` — runtime schema validation for the `projectData` input parameter.
- `@modelcontextprotocol/sdk/server/mcp.js` — provides the `McpServer` type and the `.prompt()` registration API.
- A configured and running `McpServer` instance must be provided by the application bootstrap layer before `registerProjectPrompts` is called.