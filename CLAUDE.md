# Practera MCP Server

## Overview

This is the **Practera MCP Server** — a Model Context Protocol server that gives AI agents (Cursor, Claude Desktop, etc.) direct access to Practera's GraphQL API and local project brief data. It bridges LLMs to the Practera platform for authoring, learning, reviewing, and testing workflows.

## Technology Stack

- **Protocol**: MCP (Model Context Protocol) via `@modelcontextprotocol/sdk`
- **Language**: TypeScript (ESM modules, Node.js 18+)
- **Transports**: SSE over Express (for remote/shared use) + stdio (for Cursor local spawn)
- **API**: Practera GraphQL (`core-graphql-api`) via `graphql-request`
- **Auth**: API key header OR `devLogin` mutation (local/stage only)
- **Schema validation**: Zod

## Project Structure

```
practera-mcp-server/
├── src/
│   ├── server.ts              # SSE transport — Express server, used for remote/shared
│   ├── stdio.ts               # stdio transport — Cursor spawns this directly
│   ├── routes.ts              # Express routes (/sse, /messages, /health, /docs)
│   ├── auth.ts                # PracteraAuth class (currently unused by tools)
│   │
│   ├── tools/
│   │   ├── index.ts           # Registers ALL tools — add new ones here
│   │   ├── get-project.ts     # mcp_practera_get_project
│   │   ├── get-assessment.ts  # mcp_practera_get_assessment
│   │   ├── search-project-briefs.ts  # mcp_practera_search_project_briefs
│   │   ├── author/            # Admin/coordinator tools (9)
│   │   ├── student/           # Learner tools (5)
│   │   ├── reviewer/          # Reviewer tools (2)
│   │   └── testing/           # Test runner tools (1)
│   │       └── run-tests.ts   # run_tests
│   │
│   ├── resources/
│   │   └── practera-resources.ts  # 3 MCP resources (project, assessments, briefs)
│   │
│   ├── prompts/
│   │   ├── index.ts
│   │   ├── project-analysis.ts
│   │   ├── assessment-analysis.ts
│   │   └── project-brief-selection.ts
│   │
│   ├── libs/
│   │   ├── graphql-client.ts       # PRACTERA_ENDPOINTS + createGraphQLClient
│   │   ├── auth-helper.ts          # createAuthenticatedClient (apikey OR devLogin)
│   │   ├── project-brief-service.ts
│   │   └── search-utils.ts
│   │
│   └── data/
│       ├── project_briefs.json     # ~669 KB brief catalog
│       └── skill-thesaurus.json
│
├── package.json
├── tsconfig.json
└── serverless.yml              # AWS Lambda config (partially stale)
```

## Development Setup

```bash
npm install

# SSE transport (browser/remote MCP clients connect via URL)
npm run dev          # → http://localhost:3000/sse

# stdio transport (Cursor spawns this process directly)
npm run dev:stdio

# Type check
npm run typecheck
```

## Transport Modes

### stdio (Cursor local dev — preferred)

Cursor spawns the MCP server as a subprocess and communicates over stdin/stdout. Configure in your repo's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "practera": {
      "command": "node",
      "args": ["/path/to/practera-mcp-server/dist/stdio.js"],
      "env": {
        "PRACTERA_REGION": "local",
        "AUTH_EMAIL": "your@email.com",
        "GRAPHQL_URL": "http://localhost:8000",
        "WORKSPACE_ROOT": "/path/to/practera-workspace"
      }
    }
  }
}
```

> Run `npm run build` in `practera-mcp-server` after source changes to rebuild `dist/stdio.js`.

### SSE (remote / shared)

Start the server and point MCP clients at the SSE endpoint:

```bash
npm run dev
# Connect clients to: http://localhost:3000/sse
```

## Authentication

### Production (API key)

Provide `apikey` in each tool call. The key is passed as the `apikey` HTTP header to the GraphQL API.

### Local/Stage (devLogin)

Omit `apikey` and provide `email` instead (or set `AUTH_EMAIL` env var). The server calls the `devLogin` mutation to get a JWT. Only available for `region=local` or `region=stage`.

```typescript
// auth-helper.ts handles both paths:
const client = await createAuthenticatedClient({
  apikey: params.apikey,  // production
  email: params.email,    // local/stage only
  region: params.region,
});
```

## GraphQL Endpoints

```typescript
// src/libs/graphql-client.ts
const PRACTERA_ENDPOINTS = {
  usa:   'https://core-graphql-api.usa.practera.com/',
  aus:   'https://core-graphql-api.aus.practera.com/',
  euk:   'https://core-graphql-api.euk.practera.com/',
  stage: 'https://core-graphql-api.p2-stage.practera.com/',
  local: process.env.GRAPHQL_URL || 'http://localhost:8000',
};
```

## Adding a New Tool

1. Create a file in the appropriate subfolder of `src/tools/`:

```typescript
// src/tools/author/my-new-tool.ts
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerMyNewTool(server: McpServer) {
  server.tool(
    'tool_name',             // snake_case, unique across all tools
    'Human-readable description of what this tool does.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      myParam: z.string().describe('Description for the LLM'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });
        const mutation = `mutation { ... }`;
        const data: any = await client.request(mutation, { ... });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
```

2. Register it in `src/tools/index.ts`:

```typescript
import { registerMyNewTool } from './author/my-new-tool.js';

export function registerAllTools(server: McpServer) {
  // ...existing tools...
  registerMyNewTool(server);
}
```

Both `server.ts` (SSE) and `stdio.ts` call `registerAllTools`, so registering once covers both transports.

## Available Tools

### Generic / Read-only
| Tool | Description |
|------|-------------|
| `mcp_practera_get_project` | Full project tree (milestones → activities → tasks) |
| `mcp_practera_get_assessment` | Assessment with questions and choices |
| `mcp_practera_search_project_briefs` | Search local brief catalog by skill |

### Author (admin/coordinator)
| Tool | GraphQL operation |
|------|------------------|
| `create_experience` | `createExperience` |
| `create_milestone` | `createMilestone` |
| `create_activity` | `createActivity` |
| `create_assessment` | `createAssessment` |
| `add_question` | `createAssessmentQuestion` |
| `add_task_to_activity` | `addTaskToActivity` |
| `enroll_user` | `enrollUser` |
| `import_experience` | `importExperienceData` |
| `export_experience` | `exportExperience` |

### Student (learner)
| Tool | GraphQL operation |
|------|------------------|
| `list_experiences` | `experiences` |
| `get_milestones` | `project.milestones` |
| `get_tasks` | `tasks(activityId:)` |
| `submit_assessment` | `submitAssessment` |
| `get_feedback` | `submission(id:)` with reviews |

### Reviewer
| Tool | GraphQL operation |
|------|------------------|
| `list_pending_reviews` | `reviews(status: "pending")` |
| `submit_review` | `submitReview` |

### Testing
| Tool | Description |
|------|-------------|
| `run_tests` | Run test suites across Practera repos (shells out to npm/cargo/docker) |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3000 in dev, 80 in production) |
| `NODE_ENV` | Environment |
| `GRAPHQL_URL` | Override local GraphQL endpoint (default `http://localhost:8000`) |
| `PRACTERA_REGION` | Default region (`local`, `stage`, `usa`, `aus`, `euk`) |
| `AUTH_EMAIL` | Default email for devLogin (local/stage) |
| `WORKSPACE_ROOT` | Absolute path to workspace root — used by `run_tests` tool |

## Production Build

```bash
npm run build        # tsc + copy src/data → dist/
npm start            # SSE transport (dist/server.js)
npm run start:stdio  # stdio transport (dist/stdio.js)
```

## Important Notes

> The `oauthProvider` in `server.ts` is scaffolded but not wired up — OAuth routes are not active.

> The `PracteraAuth` class in `auth.ts` and `requireAuth` middleware are defined but not used by any tool. Tools perform their own auth via `createAuthenticatedClient`.

> Resources in `practera-resources.ts` hardcode `region = "usa"` — auth context not yet threaded through.

> `devLogin` is only available when `NODE_ENV` is `development`/`local` or `ENV=local` on the GraphQL API side.
