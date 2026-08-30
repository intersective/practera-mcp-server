# Data Paths Module

<!-- module: app/data-paths / type: utility / status: draft -->

## Overview

The data-paths module provides a centralised source of truth for absolute filesystem paths to static data files used throughout the application. It resolves paths relative to the module's own location, ensuring correctness regardless of the working directory from which the application is started. Currently, the module exports a single resolved path pointing to the project briefs JSON data file. The module is implemented as an ES Module and uses `import.meta.url` to derive its own directory, replacing the CommonJS `__dirname` pattern.

## Acceptance Criteria

1. `PROJECT_BRIEFS_PATH` must be an absolute filesystem path (i.e., it must begin with `/` on POSIX systems or a drive letter on Windows).
2. `PROJECT_BRIEFS_PATH` must resolve to `<module-directory>/../data/project_briefs.json`.
3. The resolved path must remain correct regardless of the current working directory at application startup.
4. The module must be importable as an ES Module without runtime errors in a Node.js environment that supports `import.meta.url`.

## Scenarios

### Scenario 1: Importing the module and verifying the exported path is absolute

**Steps:**
1. Import `PROJECT_BRIEFS_PATH` from `src/libs/data-paths.ts` in a test file.
2. Assert that `path.isAbsolute(PROJECT_BRIEFS_PATH)` returns `true`.

**Expected Results:**
- `path.isAbsolute(PROJECT_BRIEFS_PATH)` evaluates to `true`.

### Scenario 2: Verifying the exported path points to the correct data file location

**Steps:**
1. Import `PROJECT_BRIEFS_PATH` from `src/libs/data-paths.ts`.
2. Resolve the expected path independently as `path.resolve('<absolute-path-to-src/libs>', '../data/project_briefs.json')`.
3. Assert that `PROJECT_BRIEFS_PATH` strictly equals the independently resolved expected path.

**Expected Results:**
- `PROJECT_BRIEFS_PATH` equals the expected resolved path ending in `data/project_briefs.json`.

### Scenario 3: Path correctness when the process working directory differs from the module directory

**Steps:**
1. Change the Node.js process working directory to a temporary directory (e.g., `/tmp`) before importing the module.
2. Import `PROJECT_BRIEFS_PATH` from `src/libs/data-paths.ts`.
3. Assert that `PROJECT_BRIEFS_PATH` does not contain `/tmp` and still ends with `data/project_briefs.json`.

**Expected Results:**
- `PROJECT_BRIEFS_PATH` is unaffected by the changed working directory.
- The path still resolves to the correct location relative to the module file.

### Scenario 4: Module import succeeds in an ES Module context

**Steps:**
1. Execute a Node.js script using `import` syntax to import `PROJECT_BRIEFS_PATH` from the compiled output of `src/libs/data-paths.ts`.
2. Observe the process exit code.

**Expected Results:**
- The import completes without throwing a `TypeError` or `SyntaxError`.
- The process exits with code `0`.

## Security Notes

- This module does not handle user-supplied input; all paths are statically resolved at module load time, eliminating path-traversal risk within this module itself.
- Consumers of `PROJECT_BRIEFS_PATH` must ensure that the referenced JSON file does not contain sensitive credentials or secrets before committing it to version control.

## Dependencies

- **Node.js built-in `path`** — used for `path.resolve` and `path.dirname`.
- **Node.js built-in `url`** — `fileURLToPath` converts `import.meta.url` to a filesystem path.
- **`../data/project_briefs.json`** — the static data file whose path is exported; must exist at runtime for consumers to read it successfully.