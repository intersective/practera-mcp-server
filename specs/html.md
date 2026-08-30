# HTML Pages: Homepage and Documentation

<!-- module: app/html / type: ui-pages / status: draft -->

## Overview

This module exports two static HTML page templates served by the Practera MCP Server. The homepage (`homepageHtml`) provides a brief introduction to the server and links to the documentation page. The documentation page (`docsHtml`) describes available MCP endpoints, tools, authentication options, and supported regions. Both pages share a consistent visual style using Arial font and an indigo (`#3F51B5`) colour scheme. The pages are rendered server-side as plain HTML strings and require no client-side JavaScript.

## Acceptance Criteria

1. The homepage must render an `<h1>` with the text "Practera MCP Server".
2. The homepage must contain a paragraph stating the server provides Model Context Protocol integration with Practera.
3. The homepage must contain a paragraph stating it enables LLMs to access project data and assessment information.
4. The homepage must contain a hyperlink with text "View documentation" pointing to `/docs`.
5. The documentation page must render an `<h1>` with the text "Practera MCP Server Documentation".
6. The documentation page must list the endpoints `/sse`, `/messages`, `/health`, and `/docs`.
7. The documentation page must document three tools: `mcp_practera_get_project`, `mcp_practera_get_assessment`, and `mcp_practera_search_project_briefs`.
8. The documentation page must list three supported regions: `usa`, `aus`, and `euk`.
9. Both pages must apply `max-width: 800px` and `margin: 0 auto` to the `body` element.
10. Headings and links on both pages must use colour `#3F51B5`.

## Scenarios

### Scenario 1: Homepage renders correctly

**Steps:**
1. Request the exported `homepageHtml` string and parse it as an HTML document.
2. Query the `<title>` element text content.
3. Query all `<h1>` elements and read their text content.
4. Query all `<p>` elements and collect their text content.
5. Query all `<a>` elements and read their `href` attributes and link text.

**Expected Results:**
- The `<title>` text equals "Practera MCP Server".
- Exactly one `<h1>` exists with text "Practera MCP Server".
- A `<p>` element contains the text "This server provides Model Context Protocol integration with Practera."
- A `<p>` element contains the text "It enables LLMs to access project data and assessment information from Practera."
- An `<a>` element exists with `href="/docs"` and link text "View documentation".

### Scenario 2: Documentation page renders endpoint list

**Steps:**
1. Request the exported `docsHtml` string and parse it as an HTML document.
2. Query the `<title>` element text content.
3. Query the `<h1>` element text content.
4. Locate the `<ul>` under the "Endpoints" `<h2>` and collect all `<li>` inner text values.

**Expected Results:**
- The `<title>` text equals "Practera MCP Server Documentation".
- The `<h1>` text equals "Practera MCP Server Documentation".
- The endpoint list contains exactly four items with `<code>` values `/sse`, `/messages`, `/health`, and `/docs`.

### Scenario 3: Documentation page renders tool definitions

**Steps:**
1. Parse `docsHtml` as an HTML document.
2. Query all `<h3>` elements and collect their text content.
3. For each tool `<h3>`, locate the immediately following `<p>` and `<pre><code>` block and read their content.

**Expected Results:**
- Three `<h3>` elements exist with text `mcp_practera_get_project`, `mcp_practera_get_assessment`, and `mcp_practera_search_project_briefs`.
- The `mcp_practera_get_project` code block contains the key `"assessmentId"` is absent and `"region"` is present.
- The `mcp_practera_get_assessment` code block contains `"assessmentId"` marked as required.
- The `mcp_practera_search_project_briefs` code block contains `"skill"` marked as required and `"limit"` marked as optional.
- No code block contains a literal secret or real credential value; placeholder text such as `"your-api-key"` is used instead.

### Scenario 4: Documentation page renders region list

**Steps:**
1. Parse `docsHtml` as an HTML document.
2. Locate the "Regions" `<h2>` section.
3. Collect all `<code>` values within the `<ul>` under that section.

**Expected Results:**
- Exactly three region codes are listed: `usa`, `aus`, and `euk`.
- The description for `usa` indicates it is the default region.

### Scenario 5: Shared styles are applied on both pages

**Steps:**
1. Parse `homepageHtml` and read the inline `<style>` block content.
2. Parse `docsHtml` and read the inline `<style>` block content.
3. Check `body` rule for `font-family`, `max-width`, `margin`, and `padding` properties.
4. Check heading/link colour rules.

**Expected Results:**
- Both pages declare `font-family: Arial, sans-serif` on `body`.
- Both pages declare `max-width: 800px` and `margin: 0 auto` on `body`.
- Both pages declare `color: #3F51B5` for heading and/or anchor elements.

## Security Notes

- API key values shown in documentation code examples must remain placeholder strings (e.g., `"your-api-key"`) and must never contain real credentials or tokens.
- These pages are static HTML strings; no user-supplied input is interpolated into them, eliminating XSS risk from dynamic content injection.
- No authentication is required to view the homepage or documentation page; sensitive operational details (e.g., internal API base URLs, real keys) must not appear in either template.

## Dependencies

- No runtime dependencies; both exports are plain string constants.
- The pages reference the routes `/docs`, `/sse`, `/messages`, and `/health`, which must be registered by the server routing layer for the linked endpoint descriptions to be accurate.