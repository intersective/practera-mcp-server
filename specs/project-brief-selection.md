# Project Brief Selection Prompts

<!-- module: app/project-brief-selection / type: feature / status: draft -->

## Overview

This module registers two MCP (Model Context Protocol) server prompts that assist educators and learners in discovering appropriate project briefs based on desired skills and requirements. The `skill-brief-selection` prompt accepts a target skill and project brief dataset, returning AI-guided recommendations explaining how each project develops that skill. The `complex-brief-finder` prompt extends this capability by accepting a primary skill, additional skills, complexity level, and time frame to produce more targeted recommendations. Both prompts share a common system prompt that instructs the model to act as an experiential learning expert, focusing on skill-specific relevance rather than generic project-based learning benefits. All prompt construction is performed via string interpolation of named placeholders within predefined templates.

## Acceptance Criteria

- AC-1: The MCP server exposes a prompt named `skill-brief-selection` with the description "Find project briefs that help develop specific skills".
- AC-2: `skill-brief-selection` requires exactly two string parameters: `skill` and `projectBriefData`.
- AC-3: The MCP server exposes a prompt named `complex-brief-finder` with the description "Find project briefs matching specific requirements including skills, complexity and timeframe".
- AC-4: `complex-brief-finder` requires exactly five string parameters: `primarySkill`, `additionalSkills`, `complexity`, `timeFrame`, and `projectBriefData`.
- AC-5: Both prompts produce a two-message array where the first message contains the shared system prompt text and the second message contains the populated template text, both with `role: "user"` and `type: "text"`.
- AC-6: All placeholder tokens (`{skill}`, `{primarySkill}`, `{additionalSkills}`, `{complexity}`, `{timeFrame}`, `{projectBriefData}`) are replaced with the caller-supplied values before the message is returned.
- AC-7: No placeholder tokens remain unreplaced in the returned message content.
- AC-8: The system prompt instructs the model to consider relevance, complexity, duration, deliverable alignment, and skill-specific explanation for each recommendation.

## Scenarios

### Scenario 1: Registering prompts on the MCP server

**Steps:**
1. Instantiate an `McpServer` instance.
2. Call `registerProjectBriefPrompts(server)` with the server instance.
3. Query the server's registered prompt names.

**Expected Results:**
- The server's prompt registry contains an entry with name `skill-brief-selection`.
- The server's prompt registry contains an entry with name `complex-brief-finder`.
- No other prompts are registered by this function.

---

### Scenario 2: Invoking skill-brief-selection with valid inputs

**Steps:**
1. Call the `skill-brief-selection` prompt handler with `skill = "data analysis"` and `projectBriefData = '{"projects":[]}'`.
2. Inspect the returned `messages` array.
3. Inspect the `content.text` of `messages[0]`.
4. Inspect the `content.text` of `messages[1]`.

**Expected Results:**
- The `messages` array has exactly 2 elements.
- `messages[0].role` equals `"user"` and `messages[0].content.type` equals `"text"`.
- `messages[0].content.text` contains the string "expert in experiential learning".
- `messages[1].role` equals `"user"` and `messages[1].content.type` equals `"text"`.
- `messages[1].content.text` contains the literal string `"data analysis"` in place of `{skill}` (both occurrences).
- `messages[1].content.text` contains `'{"projects":[]}'` in place of `{projectBriefData}`.
- `messages[1].content.text` does not contain the literal token `{skill}` or `{projectBriefData}`.

---

### Scenario 3: Invoking complex-brief-finder with valid inputs

**Steps:**
1. Call the `complex-brief-finder` prompt handler with `primarySkill = "machine learning"`, `additionalSkills = "Python, statistics"`, `complexity = "high"`, `timeFrame = "3 months"`, and `projectBriefData = '{"projects":[]}'`.
2. Inspect the returned `messages` array.
3. Inspect the `content.text` of `messages[0]`.
4. Inspect the `content.text` of `messages[1]`.

**Expected Results:**
- The `messages` array has exactly 2 elements.
- `messages[0].content.text` contains the string "expert in experiential learning".
- `messages[1].content.text` contains `"machine learning"` in place of `{primarySkill}`.
- `messages[1].content.text` contains `"Python, statistics"` in place of `{additionalSkills}`.
- `messages[1].content.text` contains `"high"` in place of `{complexity}`.
- `messages[1].content.text` contains `"3 months"` in place of `{timeFrame}`.
- `messages[1].content.text` contains `'{"projects":[]}'` in place of `{projectBriefData}`.
- `messages[1].content.text` does not contain any unreplaced placeholder tokens (`{primarySkill}`, `{additionalSkills}`, `{complexity}`, `{timeFrame}`, `{projectBriefData}`).

---

### Scenario 4: Providing an empty string for an optional-context parameter

**Steps:**
1. Call the `skill-brief-selection` prompt handler with `skill = "leadership"` and `projectBriefData = ""`.
2. Inspect `messages[1].content.text`.

**Expected Results:**
- The handler returns without throwing an error.
- `messages[1].content.text` contains `"leadership"` where `{skill}` appeared.
- The `[PROJECT BRIEF DATA]` section in `messages[1].content.text` is present but followed by an empty string.

---

### Scenario 5: Schema validation rejects missing required parameters for skill-brief-selection

**Steps:**
1. Attempt to invoke the `skill-brief-selection` prompt handler omitting the `skill` parameter.
2. Observe the validation result.

**Expected Results:**
- A Zod validation error is raised before the handler function executes.
- The error identifies `skill` as the missing required field.

---

### Scenario 6: Schema validation rejects missing required parameters for complex-brief-finder

**Steps:**
1. Attempt to invoke the `complex-brief-finder` prompt handler omitting the `timeFrame` parameter.
2. Observe the validation result.

**Expected Results:**
- A Zod validation error is raised before the handler function executes.
- The error identifies `timeFrame` as the missing required field.

## Security Notes

- `projectBriefData` is accepted as a raw string and injected directly into the prompt template without sanitisation. Callers must ensure this value does not contain adversarial prompt-injection content before passing it to the handler.
- No authentication or authorisation controls are implemented within this module; access control is the responsibility of the MCP server host.
- No secret values, API keys, or credentials are present in this module.

## Dependencies

- `zod` — runtime schema validation for prompt parameter definitions.
- `@modelcontextprotocol/sdk/server/mcp.js` — `McpServer` type and `server.prompt()` registration API.