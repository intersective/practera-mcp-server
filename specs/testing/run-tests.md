# Run Tests Tool

<!-- module: app/testing/run-tests / type: tool / status: draft -->

## Overview

The `run_tests` MCP tool allows an AI assistant (e.g. Cursor) to execute test suites across the Practera monorepo by shelling out to the appropriate test runner for each repository. It supports six repositories (`core-graphql-api`, `login-api`, `app-v2`, `practera`, `practera-mcp-server`, `practera-devops-center`) and a variety of per-repo suites (e.g. unit, integration, parity, cargo, phpunit). The tool resolves the workspace root from an explicit parameter, the `WORKSPACE_ROOT` environment variable, or by inferring it from the MCP server's own file location. Combined stdout and stderr output is captured and capped at 20,000 characters to avoid overwhelming the LLM context. The tool returns a structured text response including a header, captured output, and a pass/fail footer, and sets `isError: true` when the process exits with a non-zero code.

## Acceptance Criteria

1. The tool is registered under the name `run_tests` on the MCP server.
2. Calling the tool with a valid `repo` and `suite` executes the configured command in the correct working directory.
3. Calling the tool with an unknown `repo` returns an error message listing available repos and sets `isError: true`.
4. Calling the tool with a valid `repo` but unknown `suite` returns an error message listing available suites for that repo and sets `isError: true`.
5. When `pattern` is provided and the command is `npm` or `npx`, `--testPathPattern <pattern>` is appended to the argument list.
6. When `pattern` is provided and the command is neither `npm` nor `npx` (e.g. `cargo`, `docker`), the pattern is not appended.
7. Output exceeding 20,000 characters is truncated and the truncation notice `[... output truncated at 20 000 chars ...]` is appended.
8. The response footer contains `Exit code: <N> — PASSED` when exit code is 0, and `Exit code: <N> — FAILED` otherwise.
9. If the child process fails to start, the output contains `Failed to start process: <message>` and `exitCode` is 1.
10. Workspace root resolution priority is: explicit `workspaceRoot` parameter → `WORKSPACE_ROOT` env var → path inferred from MCP server location.

## Scenarios

### Scenario 1: Successful test run with known repo and suite

**Steps:**
1. Invoke `run_tests` with `repo = "login-api"`, `suite = "unit"`, and a valid `workspaceRoot` pointing to a directory where `login-api/` exists.
2. Observe the spawned process command and working directory.
3. Wait for the tool response.

**Expected Results:**
- The spawned command is `npx vitest run tests/unit --reporter=verbose` executed in `<workspaceRoot>/login-api`.
- The response `content[0].text` begins with `Running: login-api — unit`.
- The response `content[0].text` contains `Description: Vitest unit tests for login-api`.
- The response `content[0].text` ends with `Exit code: 0 — PASSED` (assuming tests pass).
- `isError` is `false`.

### Scenario 2: Unknown repo returns error

**Steps:**
1. Invoke `run_tests` with `repo = "nonexistent-repo"` and `suite = "unit"`.
2. Observe the tool response immediately (no process should be spawned).

**Expected Results:**
- The response `content[0].text` contains `Unknown repo "nonexistent-repo"`.
- The response `content[0].text` lists all six valid repo names.
- `isError` is `true`.

### Scenario 3: Unknown suite for a valid repo returns error

**Steps:**
1. Invoke `run_tests` with `repo = "app-v2"` and `suite = "integration"`.
2. Observe the tool response immediately (no process should be spawned).

**Expected Results:**
- The response `content[0].text` contains `Unknown suite "integration" for repo "app-v2"`.
- The response `content[0].text` lists `unit` as the only available suite for `app-v2`.
- `isError` is `true`.

### Scenario 4: Pattern filter appended for npm-based runner

**Steps:**
1. Invoke `run_tests` with `repo = "core-graphql-api"`, `suite = "unit"`, `pattern = "UserService"`, and a valid `workspaceRoot`.
2. Capture the arguments passed to the spawned process.

**Expected Results:**
- The spawned argument list includes `--testPathPattern` followed by `UserService`.
- The response `content[0].text` header line contains `--testPathPattern UserService`.

### Scenario 5: Pattern filter NOT appended for non-npm runner

**Steps:**
1. Invoke `run_tests` with `repo = "practera-devops-center"`, `suite = "cargo"`, `pattern = "some_filter"`, and a valid `workspaceRoot`.
2. Capture the arguments passed to the spawned process.

**Expected Results:**
- The spawned argument list is exactly `["test"]` with no `--testPathPattern` entry.
- The response `content[0].text` header command line does not contain `--testPathPattern`.

### Scenario 6: Output truncation at 20,000 characters

**Steps:**
1. Invoke `run_tests` targeting a suite whose combined stdout+stderr output exceeds 20,000 characters.
2. Observe the `content[0].text` of the response.

**Expected Results:**
- The captured output portion of `content[0].text` is no longer than 20,000 characters of raw command output.
- The text contains the literal string `[... output truncated at 20 000 chars ...]`.

### Scenario 7: Process fails to start

**Steps:**
1. Invoke `run_tests` with a valid `repo` and `suite` but configure the environment so the command binary is not found (e.g. `PATH` is empty).
2. Observe the tool response.

**Expected Results:**
- The response `content[0].text` contains `Failed to start process:` followed by the OS error message.
- The footer contains `Exit code: 1 — FAILED`.
- `isError` is `true`.

### Scenario 8: Workspace root resolution priority

**Steps:**
1. Invoke `run_tests` with an explicit `workspaceRoot` parameter set to `/explicit/root`, while `WORKSPACE_ROOT` env var is set to `/env/root`.
2. Observe the working directory used for the spawned process.

**Expected Results:**
- The working directory resolves under `/explicit/root`, not `/env/root`.

### Scenario 9: PHPUnit suite runs inside Docker

**Steps:**
1. Invoke `run_tests` with `repo = "practera"`, `suite = "phpunit"`, and a valid `workspaceRoot`.
2. Capture the spawned command and arguments.

**Expected Results:**
- The spawned command is `docker` with arguments `["exec", "practera-core", "./vendor/bin/phpunit"]`.
- The working directory is `<workspaceRoot>` (i.e. `config.cwd` is `.`).

### Scenario 10: Failed test run sets isError

**Steps:**
1. Invoke `run_tests` targeting a suite where the test runner exits with a non-zero exit code.
2. Observe the tool response.

**Expected Results:**
- The footer in `content[0].text` contains `FAILED`.
- `isError` is `true`.

## Security Notes

- No API keys, tokens, or credentials are present in this source file.
- The tool inherits the full `process.env` of the MCP server process when spawning child processes; callers should ensure the server environment does not contain sensitive values that should not be exposed to test subprocesses.
- `shell: false` is used for `spawn`, which prevents shell injection via `cmd` or `args` values; however, `repo` and `suite` are validated against a fixed registry before use.
- The `workspaceRoot` parameter is accepted from the caller without path sanitisation; the MCP server should only be accessible to trusted clients.

## Dependencies

- `zod` — input schema validation for tool parameters.
- `@modelcontextprotocol/sdk` (`McpServer`) — MCP server registration and tool dispatch.
- Node.js built-in `child_process.spawn` — subprocess execution.
- Node.js built-in `path` — working directory resolution.
- `WORKSPACE_ROOT` environment variable — optional fallback for workspace root resolution.
- Docker daemon — required at runtime for the `practera` / `phpunit` suite.
- `cargo` CLI — required at runtime for the `practera-devops-center` / `cargo` suite.