# Practera MCP Server

An MCP (Model Context Protocol) server that gives AI agents direct access to Practera's GraphQL API and local project brief data. Connect Cursor, Claude Desktop, or any MCP client to author learning programs, manage assessments, submit work as a learner, conduct reviews, and run test suites across the Practera monorepo.

## Why Practera MCP?

With this MCP server, an agent can:

- Analyse and restructure existing projects for different audiences or grade levels
- Generate assessment blueprints and create questions automatically
- Import/export programs between institutions or LMS data formats
- Submit assessments and manage review workflows
- Search a library of 5400+ experiential learning project briefs by skill
- Run test suites across all Practera repos directly from Cursor

## Quick Start (Cursor — local dev)

1. Clone this repo alongside the other Practera repos.
2. Install dependencies: `npm install`
3. Add `.cursor/mcp.json` to any Practera repo (see [Cursor Configuration](#cursor-configuration)).
4. Reload the Cursor MCP panel — the `practera` server will appear.

No separate server process needed. Cursor spawns the MCP server via stdio automatically.

## Transports

### stdio (Cursor local — recommended)

Cursor spawns the server as a subprocess. No separate `npm run dev` needed.

```bash
# For manual testing / debugging
npm run dev:stdio
```

### SSE (remote / shared)

An HTTP server with Server-Sent Events — use when multiple clients share one instance.

```bash
npm run dev        # → http://localhost:3000/sse
```

Connect an MCP client to `http://localhost:3000/sse`.

## Cursor Configuration

Create `.cursor/mcp.json` in your repo (or add to `~/.cursor/mcp.json` for all workspaces):

```json
{
  "mcpServers": {
    "practera": {
      "command": "node",
      "args": [
        "/absolute/path/to/practera-mcp-server/dist/stdio.js"
      ],
      "env": {
        "PRACTERA_REGION": "local",
        "AUTH_EMAIL": "your@email.com",
        "GRAPHQL_URL": "http://localhost:8000",
        "WORKSPACE_ROOT": "/absolute/path/to/practera-workspace"
      }
    }
  }
}
```

> Run `npm run build` in `practera-mcp-server` after any source changes to rebuild `dist/stdio.js`.

For production regions, omit `AUTH_EMAIL`/`GRAPHQL_URL` and pass `apikey` in each tool call instead.

## Authentication

### API Key (production)

Pass `apikey` in each tool call. The key is forwarded as the `apikey` HTTP header to the GraphQL API.

### devLogin (local/stage only)

Omit `apikey` and set `AUTH_EMAIL` (or pass `email` per tool call). The server calls the `devLogin` GraphQL mutation to obtain a JWT automatically. Only works with `region=local` or `region=stage`.

## Available Tools

### Generic / Read-only

| Tool | Description |
|------|-------------|
| `mcp_practera_get_project` | Full project tree: milestones, activities, tasks |
| `mcp_practera_get_assessment` | Assessment detail with questions and answer choices |
| `mcp_practera_search_project_briefs` | Search the local brief catalog by skill keyword |

### Author (admin/coordinator role required)

| Tool | GraphQL Operation | Description |
|------|------------------|-------------|
| `create_experience` | `createExperience` | Create a new program inside an institution |
| `create_milestone` | `createMilestone` | Add a milestone to an experience |
| `create_activity` | `createActivity` | Add an activity to a milestone |
| `create_assessment` | `createAssessment` | Create an assessment on an activity |
| `add_question` | `createAssessmentQuestion` | Add a question to an assessment |
| `add_task_to_activity` | `addTaskToActivity` | Add a task (resource/link) to an activity |
| `enroll_user` | `enrollUser` | Enroll a user in an experience |
| `import_experience` | `importExperienceData` | Bulk-import experience content from a JSON export |
| `export_experience` | `exportExperience` | Export an experience structure as JSON |

### Student (learner)

| Tool | GraphQL Operation | Description |
|------|------------------|-------------|
| `list_experiences` | `experiences` | List all experiences for the current user |
| `get_milestones` | `project.milestones` | Get milestones and activities for a project |
| `get_tasks` | `tasks(activityId:)` | Get tasks for an activity |
| `submit_assessment` | `submitAssessment` | Submit an assessment |
| `get_feedback` | `submission(id:)` | Get submission details including review feedback |

### Reviewer

| Tool | GraphQL Operation | Description |
|------|------------------|-------------|
| `list_pending_reviews` | `reviews(status: "pending")` | List assessments awaiting review |
| `submit_review` | `submitReview` | Submit a completed review |

### Testing

| Tool | Description |
|------|-------------|
| `run_tests` | Run a test suite across any Practera repo — shells out to npm/cargo/docker |

#### `run_tests` parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `repo` | Yes | Which repo: `practera-graphql-api`, `practera-login-api`, `practera-app`, `practera-admin`, `practera-mcp-server`, `practera-devops-center` |
| `suite` | Yes | Which suite (see table below) |
| `pattern` | No | Test file/name filter (passed as `--testPathPattern` for Jest targets) |
| `workspaceRoot` | No | Absolute path to workspace root. Falls back to `WORKSPACE_ROOT` env var. |

#### Available test suites

| Repo | Suite | Command |
|------|-------|---------|
| `practera-graphql-api` | `unit` | `npm test` (Jest, with coverage) |
| `practera-graphql-api` | `integration` | `npm run test:integration` |
| `practera-graphql-api` | `parity` | `npm run test:parity` |
| `practera-login-api` | `unit` | `npx vitest run tests/unit` |
| `practera-login-api` | `integration` | `npx vitest run tests/integration` |
| `practera-login-api` | `full` | `npm run test:coverage` |
| `practera-app` | `unit` | `npm test -- --watch=false --browsers=ChromeHeadless` |
| `practera-admin` | `phpunit` | `docker exec practera-admin ./testing/phpunit/run_suite.sh testing/phpunit/Test/Case` |
| `practera-mcp-server` | `typecheck` | `npm run typecheck` |
| `practera-devops-center` | `cargo` | `cargo test` |

## MCP Resources

| Resource URI | Description |
|-------------|-------------|
| `practera://project/current` | Current project data (GraphQL) |
| `practera://assessments/{assessmentId}` | Assessment by ID |
| `practera://briefs/{briefId}` | Project brief from local catalog |

## MCP Prompts

| Prompt | Purpose |
|--------|---------|
| `project-analysis` | Analyse project structure and learning design quality |
| `assessment-analysis` | Evaluate assessment structure and question quality |
| `skill-brief-selection` | Find briefs matching a skill from the catalog |
| `complex-brief-finder` | Match briefs by skill, complexity, and timeframe |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default 3000 dev / 80 production) |
| `NODE_ENV` | Environment (`development`, `production`) |
| `GRAPHQL_URL` | Override local GraphQL endpoint |
| `PRACTERA_REGION` | Default region: `local`, `stage`, `usa`, `aus`, `euk` |
| `AUTH_EMAIL` | Default email for devLogin (local/stage) |
| `WORKSPACE_ROOT` | Absolute path to workspace root — used by `run_tests` |

## GraphQL Regions

| Region | Endpoint |
|--------|---------|
| `local` | `http://localhost:8000` (or `GRAPHQL_URL`) |
| `stage` | `https://core-graphql-api.p2-stage.practera.com/` |
| `usa` | `https://core-graphql-api.usa.practera.com/` |
| `aus` | `https://core-graphql-api.aus.practera.com/` |
| `euk` | `https://core-graphql-api.euk.practera.com/` |

## Build and Deploy

```bash
# Build
npm run build       # compiles TS + copies src/data → dist/

# Run SSE server (compiled)
npm start

# Run stdio (compiled — use in production Cursor config)
npm run start:stdio
```

### AWS App Runner

The `apprunner.yaml` configures an App Runner service running the SSE server on port 80.

### AWS Lambda (not production-ready)

`serverless.yml` exists but `dist/server.handler` is not a Lambda handler export — `server.ts` starts
an Express process directly. Wrap with `serverless-http` before deploying to Lambda. Use App Runner
for production deployment.

## Roadmap

- [x] GraphQL read access (project, assessment)
- [x] Author CRUD tools (create experience, milestone, activity, assessment, questions, tasks, enroll)
- [x] Import/export experience JSON
- [x] Student tools (list, submit, feedback)
- [x] Reviewer tools (list pending, submit review)
- [x] Project brief search (5400+ briefs, skill-based)
- [x] stdio transport for Cursor integration
- [x] run_tests tool for cross-repo test execution
- [ ] Metrics API (generate LLM-readable reports from `calculateMetrics`)
- [ ] OAuth 2.1 (provider scaffolded in `server.ts` — not active, not wired)
- [x] Resources use env-based auth (`PRACTERA_REGION` + `PRACTERA_APIKEY` / `AUTH_EMAIL`)
- [ ] Per-request auth context in MCP Resources (currently env-only)
- [ ] `assign_reviewer`, `handle_review` tools for reviewer workflow management
- [ ] Media asset generation
- [ ] `practera-ops` CLI integration (G1 — designer/pm/industry compound commands)
- [ ] `practera-dev` CLI integration (G2 — local tooling, schema introspection)
- [ ] Persona Skills (G3 — designer / pm / industry / developer)

## License

MIT
