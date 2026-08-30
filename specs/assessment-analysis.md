# Assessment Analysis Prompt Feature

<!-- module: app/assessment-analysis / type: prompt-registration / status: draft -->

## Overview

This feature registers an MCP (Model Context Protocol) prompt named `assessment-analysis` on a given `McpServer` instance. The prompt accepts a single `assessmentData` parameter containing JSON-encoded Practera assessment data and constructs a two-message conversation payload for an AI model to evaluate assessment design. The system message establishes the AI's expert role in assessment design and experiential learning, while the user message injects the provided assessment data into a structured analysis template. The resulting prompt guides the model to produce actionable recommendations covering structure, question quality, learning alignment, and constructive alignment principles.

## Acceptance Criteria

- AC-1: The `assessment-analysis` prompt is registered on the `McpServer` with the exact name `"assessment-analysis"`.
- AC-2: The prompt description is `"Analyze a Practera assessment structure and design"`.
- AC-3: The prompt accepts exactly one input parameter, `assessmentData`, typed as a non-empty string with the description `"JSON data about the assessment structure and questions"`.
- AC-4: The resolved prompt payload contains exactly two messages, both with `role: "user"` and `type: "text"` content.
- AC-5: The first message content equals the full `assessmentAnalysisSystemPrompt` string verbatim.
- AC-6: The second message content is the `getAssessmentPromptTemplate` string with the literal placeholder `{assessmentData}` replaced by the value of the `assessmentData` input parameter.
- AC-7: No raw secret values, API keys, or credentials appear in any prompt string or registered metadata.

## Scenarios

### Scenario 1: Successful prompt registration

**Steps:**
1. Instantiate a mock or real `McpServer`.
2. Call `registerAssessmentPrompts(server)`.
3. Query the server's registered prompts for an entry with name `"assessment-analysis"`.

**Expected Results:**
- A prompt named `"assessment-analysis"` exists in the server's prompt registry.
- The prompt's description field equals `"Analyze a Practera assessment structure and design"`.
- The prompt's parameter schema declares a required `assessmentData` field of type `string`.

### Scenario 2: Prompt resolves correct two-message payload

**Steps:**
1. Register the prompt via `registerAssessmentPrompts(server)`.
2. Invoke the `assessment-analysis` prompt handler with `assessmentData` set to `'{"id":1,"title":"Test Assessment"}'`.
3. Inspect the returned `messages` array.

**Expected Results:**
- The `messages` array has a length of exactly `2`.
- `messages[0].role` equals `"user"`.
- `messages[0].content.type` equals `"text"`.
- `messages[0].content.text` equals the full `assessmentAnalysisSystemPrompt` constant without modification.
- `messages[1].role` equals `"user"`.
- `messages[1].content.type` equals `"text"`.
- `messages[1].content.text` contains the string `'{"id":1,"title":"Test Assessment"}'` at the position where `{assessmentData}` appeared in the template.
- `messages[1].content.text` does not contain the literal substring `{assessmentData}`.

### Scenario 3: Placeholder substitution with multi-line JSON input

**Steps:**
1. Register the prompt via `registerAssessmentPrompts(server)`.
2. Invoke the `assessment-analysis` prompt handler with `assessmentData` set to a multi-line JSON string containing nested objects and arrays.
3. Inspect `messages[1].content.text`.

**Expected Results:**
- The entire multi-line JSON string appears verbatim in `messages[1].content.text`.
- The literal `{assessmentData}` placeholder is absent from `messages[1].content.text`.
- All other template text surrounding the placeholder is preserved unchanged.

### Scenario 4: Schema rejects missing assessmentData parameter

**Steps:**
1. Register the prompt via `registerAssessmentPrompts(server)`.
2. Attempt to invoke the `assessment-analysis` prompt handler without supplying the `assessmentData` argument (or supplying a non-string value).
3. Observe the validation result.

**Expected Results:**
- The Zod schema validation fails and raises a validation error.
- No `messages` payload is returned.
- The server does not throw an unhandled exception outside of the validation layer.

## Security Notes

- The `assessmentData` parameter is injected directly into the prompt text via string replacement. Consumers must sanitise or validate the JSON content before passing it to the prompt to prevent prompt-injection attacks.
- No credentials, API keys, or secret tokens are present in any prompt string registered by this module.
- The prompt strings must not be modified to include dynamic values sourced from untrusted external systems without prior sanitisation.

## Dependencies

- `zod` — runtime schema validation for the `assessmentData` parameter.
- `@modelcontextprotocol/sdk/server/mcp.js` — provides the `McpServer` type and the `server.prompt()` registration API.
- A configured and running `McpServer` instance must be supplied by the caller of `registerAssessmentPrompts`.