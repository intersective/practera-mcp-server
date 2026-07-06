# AGENTS.md

## Overview

This is the **Practera MCP Server** — a Model Context Protocol server giving AI agents (Cursor, Claude Desktop) direct access to Practera's GraphQL API and project brief data.

## Build & Test

```bash
npm install
npm run build       # tsc + copy data files to dist/
npm run typecheck   # TypeScript check without emit
npm run dev         # SSE transport on :3000
npm run dev:stdio   # stdio transport (Cursor spawns this)
```

## Key Rules for AI Agents

- **Rebuild after source changes**: run `npm run build` before testing — Cursor uses `dist/stdio.js`.
- **Add new tools** in `src/tools/`, register in `src/tools/index.ts` — both SSE and stdio transports pick them up automatically.
- **Auth**: use `createAuthenticatedClient` from `src/libs/auth-helper.ts` — never call GraphQL directly with raw credentials.
- **`devLogin` only for local/stage** — never call it in production tools.
- **CLI shims** (`ops_command`, `dev_command`): thin wrappers over `practera-ops` and `practera-dev` CLIs. Keep them thin.
- **No secrets in code.** Use env vars: `PRACTERA_REGION`, `AUTH_EMAIL`, `GRAPHQL_URL`, `PRACTERA_APIKEY`.

## Safety Rules

- NO secrets or credentials in code or committed config files.
- Do not expose internal Practera data structures in public tool descriptions.
- `devLogin` mutation is only available on `local` and `stage` — guard all uses.
