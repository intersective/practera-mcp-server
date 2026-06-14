# Practera MCP Server

An MCP (Model Context Protocol) server that gives AI agents direct access to Practera's GraphQL API and local project brief data. Connect Cursor, Claude Desktop, or any MCP client to author learning programs, manage assessments, run CLI persona commands, and trigger cross-repo test suites.

## Why Practera MCP?

With this MCP server, an agent can:

- Analyse and restructure existing projects for different audiences or grade levels
- Generate assessment blueprints and create questions automatically
- Import/export programs between institutions or LMS data formats
- Run compound `practera-ops` commands (scaffold-experience, PM cohort reports, industry brief search)
- Run `practera-dev` commands (test suites, schema introspection, workspace status, devLogin)
- Submit assessments and manage review workflows (QA simulation)
- Search a library of 5400+ experiential learning project briefs by skill

## Quick Start (Cursor — local dev)

1. Clone this repo alongside the other Practera repos.
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Add `.cursor/mcp.json` to any Practera repo (see [Cursor Configuration](#cursor-configuration)).
5. Reload the Cursor MCP panel — the `practera` server will appear.

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
        "GRAPHQL_URL": "https://graphql.practera.local",
        "WORKSPACE_ROOT": "/absolute/path/to/practera-workspace"
      }
    }
  }
}
```

> `GRAPHQL_URL` should point to the local nginx alias (`https://graphql.practera.local`) when the full stack is running, or `http://localhost:8000` for direct access.
>
> Run `npm run build` in `practera-mcp-server` after any source changes to rebuild `dist/`.

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

### CLI Shims — `practera-ops` (Ops Personas)

The `ops_command` tool is a thin shim over the `practera-ops` CLI. Use it for compound commands and reporting that span multiple GraphQL operations.

**Persona groups:** `designer` · `pm` · `industry`

| Tool | Parameter | Example |
|------|-----------|---------|
| `ops_command` | `group: "designer"` | `scaffold-experience --name "My Program" --milestones 3` |
| `ops_command` | `group: "pm"` | `report <experienceId>` · `cohort-summary [experienceId]` |
| `ops_command` | `group: "industry"` | `search "sustainability"` · `brief "<title>"` |

```
practera-ops designer scaffold-experience --name "UX Internship" --milestones 4
practera-ops pm report 42
practera-ops industry search "data analytics"
```

### CLI Shim — `practera-dev` (Developer Tooling)

The `dev_command` tool wraps the `practera-dev` CLI for local development utilities.

| Tool | `command` value | Description |
|------|-----------------|-------------|
| `dev_command` | `test` | Run a test suite via `practera-test-suite` — e.g. `args: ["integration", "--env", "local"]` |
| `dev_command` | `login` | `devLogin` and print JWT — e.g. `args: ["--email", "dev@example.com"]` |
| `dev_command` | `schema` | Print GraphQL schema via introspection |
| `dev_command` | `status` | Show workspace repo + Docker service status |

### QA Simulation (learner + reviewer workflows)

These tools drive learner and reviewer flows against the live GraphQL API — useful for integration testing and AI-driven QA simulations.

| Tool | GraphQL Operation | Description |
|------|------------------|-------------|
| `list_experiences` | `experiences` | List all experiences for the current user |
| `get_milestones` | `project.milestones` | Get milestones and activities for a project |
| `get_tasks` | `tasks(activityId:)` | Get tasks for an activity |
| `submit_assessment` | `submitAssessment` | Submit an assessment |
| `get_feedback` | `submission(id:)` | Get submission details including review feedback |
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

> **Tip:** Prefer `dev_command` with `command: "test"` for test runs triggered by an agent — it delegates to `practera-test-suite` and supports all suite types including browser, load, and security.

## Architecture — Two-CLI Design

The MCP server has two internal CLIs that tools shim into:

```
practera-mcp-server/src/cli/
├── ops/           # practera-ops — ops personas (designer, pm, industry)
│   ├── designer.ts
│   ├── pm.ts
│   └── industry.ts
└── dev/           # practera-dev — developer tooling
    └── index.ts   # test | login | schema | status
```

**`practera-ops`** targets ops personas (designers, PMs, industry partners) and wraps GraphQL mutations/queries into compound task-oriented commands.

**`practera-dev`** targets developers and wraps `practera-test-suite`, devLogin, and schema introspection.

Both CLIs can be run directly for debugging:

```bash
node dist/cli/ops/index.js designer list-experiences
node dist/cli/dev/index.js test integration --env local
```

## MCP Resources

| Resource URI | Description |
|-------------|-------------|
| `practera://project/current` | Current project data (GraphQL) |
| `practera://assessments/{assessmentId}` | Assessment by ID |
| `practera://briefs/{briefId}` | Project brief from local catalog |

> Resources use env-based auth (`PRACTERA_REGION` + `PRACTERA_APIKEY` / `AUTH_EMAIL`). Per-request auth context is not yet threaded through.

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
| `GRAPHQL_URL` | Override local GraphQL endpoint (default: `https://graphql.practera.local`) |
| `PRACTERA_REGION` | Default region: `local`, `stage`, `usa`, `aus`, `euk` |
| `AUTH_EMAIL` | Default email for devLogin (local/stage) |
| `PRACTERA_APIKEY` | Default API key / JWT (production) |
| `WORKSPACE_ROOT` | Absolute path to workspace root — used by `run_tests`, `dev_command`, `ops_command` |

## GraphQL Regions

| Region | Endpoint |
|--------|---------|
| `local` | `https://graphql.practera.local` (or `GRAPHQL_URL`) |
| `stage` | `https://core-graphql-api.p2-stage.practera.com/` |
| `usa` | `https://core-graphql-api.usa.practera.com/` |
| `aus` | `https://core-graphql-api.aus.practera.com/` |
| `euk` | `https://core-graphql-api.euk.practera.com/` |

## Build and Deploy

```bash
# Build (compiles TS + copies src/data → dist/)
npm run build

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
- [x] QA simulation tools (learner + reviewer workflows)
- [x] Project brief search (5400+ briefs, skill-based)
- [x] stdio transport for Cursor integration
- [x] `run_tests` tool for cross-repo test execution
- [x] `practera-ops` CLI + `ops_command` shim (designer / pm / industry personas)
- [x] `practera-dev` CLI + `dev_command` shim (test / login / schema / status)
- [ ] Metrics API (generate LLM-readable reports from `calculateMetrics`)
- [ ] OAuth 2.1 (provider scaffolded in `server.ts` — not active)
- [ ] Per-request auth context in MCP Resources (currently env-only)
- [ ] `assign_reviewer`, `handle_review` tools for reviewer workflow management
- [ ] Media asset generation

## License

MIT
