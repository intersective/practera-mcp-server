# ChatGPT app submission

## Public app scope

The submission surface is the Streamable HTTP endpoint at `/mcp`. It is an
anonymous, read-only project brief discovery app with:

- `search`: standard project brief search.
- `fetch`: standard full project brief retrieval.
- `render_project_briefs`: visual comparison for IDs returned by `search`.

The legacy stdio/SSE surface contains privileged authoring, learner, reviewer,
CLI, and test tools. It is intentionally not advertised by `/mcp` because those
tools currently accept Practera credentials as arguments and are not suitable
for a public app. Add MCP OAuth 2.1 before moving any of them to the public
surface.

## Suggested listing

- Name: Practera Project Briefs
- Short description: Discover authentic experiential learning project ideas by
  skill, industry, duration, and deliverables.
- Category: Education
- Long description: Search Practera's project brief library for authentic,
  work-based learning ideas. Open a complete brief or compare several ideas in
  a visual card layout before adapting one to a course or program.

## Starter prompts

1. Find project briefs that build data analysis skills.
2. Show me experiential learning ideas for sustainability and compare the best
   five.
3. Find a six-to-ten-week project that develops communication skills.
4. Open the full brief for the mobile community engagement project.

## Positive test cases

1. Prompt: "Find projects for data analysis."
   Expected: `search` runs with `query: "data analysis"` and returns JSON with
   `results`, each containing only `id`, `title`, and `url`.
2. Prompt: "Compare the first three."
   Expected: `render_project_briefs` receives IDs from the prior `search`,
   returns matching structured content, and renders the widget.
3. Prompt: "Open the full details of the first result."
   Expected: `fetch` uses the prior result ID and returns `id`, `title`, `text`,
   `url`, and metadata.
4. Prompt: "Find projects that develop communication."
   Expected: `search` returns relevant technical or professional skill matches.
5. Prompt: "Find sustainability briefs and summarize likely deliverables."
   Expected: `search`, then one or more `fetch` calls; the answer is grounded in
   fetched brief content.

## Negative test cases

1. Prompt: "Create this experience in my Practera account."
   Expected: explain that this public app discovers briefs but cannot access or
   modify a Practera account.
2. Prompt: "Use this Practera API key: sk-example."
   Expected: do not request, retain, or send the credential; explain that the
   public app does not accept API keys.
3. Prompt: "Delete a project brief."
   Expected: explain that the app is read-only and cannot delete briefs.

## Production checklist

- Deploy to a stable public HTTPS origin with streaming support.
- Set `PUBLIC_BASE_URL` to that origin.
- Set `WIDGET_DOMAIN` to the dedicated HTTPS widget origin used by this app.
- Configure `OPENAI_APPS_CHALLENGE` with the exact portal-issued verification
  token, verify the domain, then remove or rotate it when appropriate.
- Confirm the publisher has Platform Apps Management write access and a
  verified developer or business identity.
- Publish matching website, support, privacy policy, and terms URLs.
- Supply a production logo and widget screenshots.
- Scan the production `/mcp` endpoint in the submission portal.
- Re-run the five positive and three negative tests above in ChatGPT.
- Confirm logs and tool responses contain no credentials, personal data,
  request IDs, session IDs, or debug payloads.

## Annotation justifications

- `search`: read-only and idempotent. It searches a bundled public catalog and
  changes no state. It does not publish or write to external systems.
- `fetch`: read-only and idempotent. It retrieves one bundled catalog record and
  changes no state. It does not publish or write to external systems.
- `render_project_briefs`: read-only and idempotent. It formats existing public
  catalog records for a widget and changes no state. It does not publish or
  write to external systems.
