import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Describes a runnable test target across the Practera monorepo.
 * Mirrors the TestTarget/TestKind definitions in practera-devops-center/src/dev/tests.rs.
 */
interface TestConfig {
  description: string;
  /** Working directory relative to WORKSPACE_ROOT */
  cwd: string;
  /** Command to run */
  cmd: string;
  args: string[];
}

type RepoKey = 'core-graphql-api' | 'login-api' | 'app-v2' | 'practera' | 'practera-mcp-server' | 'practera-devops-center';
type SuiteKey = string;

const TEST_TARGETS: Record<RepoKey, Record<SuiteKey, TestConfig>> = {
  'core-graphql-api': {
    unit: {
      description: 'Jest unit tests (selectProjects unit, with coverage)',
      cwd: 'core-graphql-api',
      cmd: 'npm',
      args: ['test'],
    },
    integration: {
      description: 'Jest integration tests against real DB (runInBand)',
      cwd: 'core-graphql-api',
      cmd: 'npm',
      args: ['run', 'test:integration'],
    },
    parity: {
      description: 'CakePHP vs GraphQL parity tests',
      cwd: 'core-graphql-api',
      cmd: 'npm',
      args: ['run', 'test:parity'],
    },
  },
  'login-api': {
    unit: {
      description: 'Vitest unit tests for login-api',
      cwd: 'login-api',
      cmd: 'npx',
      args: ['vitest', 'run', 'tests/unit', '--reporter=verbose'],
    },
    integration: {
      description: 'Vitest integration tests for login-api',
      cwd: 'login-api',
      cmd: 'npx',
      args: ['vitest', 'run', 'tests/integration', '--reporter=verbose'],
    },
    full: {
      description: 'All login-api tests with coverage',
      cwd: 'login-api',
      cmd: 'npm',
      args: ['run', 'test:coverage'],
    },
  },
  'app-v2': {
    unit: {
      description: 'Karma/Jasmine unit tests for app-v2',
      cwd: 'app-v2',
      cmd: 'npm',
      args: ['test', '--', '--watch=false', '--browsers=ChromeHeadless'],
    },
  },
  'practera': {
    phpunit: {
      description: 'PHPUnit tests inside the practera-core Docker container',
      cwd: '.',
      cmd: 'docker',
      args: ['exec', 'practera-core', './vendor/bin/phpunit'],
    },
  },
  'practera-mcp-server': {
    typecheck: {
      description: 'TypeScript type checking for practera-mcp-server',
      cwd: 'practera-mcp-server',
      cmd: 'npm',
      args: ['run', 'typecheck'],
    },
  },
  'practera-devops-center': {
    cargo: {
      description: 'Rust unit tests for practera-devops-center',
      cwd: 'practera-devops-center',
      cmd: 'cargo',
      args: ['test'],
    },
  },
};

/**
 * Runs a shell command and returns all stdout+stderr as a string.
 * Returns up to MAX_OUTPUT_CHARS characters to avoid overwhelming the LLM context.
 */
function runCommand(cmd: string, args: string[], cwd: string, pattern?: string): Promise<{ output: string; exitCode: number }> {
  const MAX_OUTPUT_CHARS = 20_000;

  return new Promise((resolve) => {
    const finalArgs = pattern && (cmd === 'npm' || cmd === 'npx')
      ? [...args, '--testPathPattern', pattern]
      : args;

    const proc = spawn(cmd, finalArgs, {
      cwd,
      env: { ...process.env },
      shell: false,
    });

    const chunks: string[] = [];
    let totalLen = 0;
    let truncated = false;

    const collect = (data: Buffer) => {
      if (truncated) return;
      const str = data.toString();
      if (totalLen + str.length > MAX_OUTPUT_CHARS) {
        chunks.push(str.slice(0, MAX_OUTPUT_CHARS - totalLen));
        chunks.push('\n\n[... output truncated at 20 000 chars ...]');
        truncated = true;
      } else {
        chunks.push(str);
        totalLen += str.length;
      }
    };

    proc.stdout.on('data', collect);
    proc.stderr.on('data', collect);

    proc.on('close', (code) => {
      resolve({ output: chunks.join(''), exitCode: code ?? 1 });
    });

    proc.on('error', (err) => {
      resolve({ output: `Failed to start process: ${err.message}`, exitCode: 1 });
    });
  });
}

export function registerRunTestsTool(server: McpServer) {
  const repoChoices = Object.keys(TEST_TARGETS) as RepoKey[];
  const suiteDescription = Object.entries(TEST_TARGETS)
    .map(([repo, suites]) => `${repo}: ${Object.keys(suites).join(', ')}`)
    .join(' | ');

  server.tool(
    'run_tests',
    `Run a Practera project test suite from within Cursor. Shells out to npm/cargo/docker. Available targets — ${suiteDescription}`,
    {
      repo: z.enum(repoChoices as [RepoKey, ...RepoKey[]]).describe(
        'Which repo to test. One of: ' + repoChoices.join(', ')
      ),
      suite: z.string().describe(
        `Which test suite to run. Options per repo: ${suiteDescription}`
      ),
      pattern: z.string().optional().describe(
        'Optional test file/name filter (passed as --testPathPattern for Jest targets).'
      ),
      workspaceRoot: z.string().optional().describe(
        'Absolute path to the Practera workspace root (parent of all repo dirs). ' +
        'Falls back to WORKSPACE_ROOT env var, then auto-detected from MCP server location.'
      ),
    },
    async (params) => {
      const repo = params.repo as RepoKey;
      const suite = params.suite as SuiteKey;

      const suites = TEST_TARGETS[repo];
      if (!suites) {
        const available = Object.keys(TEST_TARGETS).join(', ');
        return {
          content: [{ type: 'text' as const, text: `Unknown repo "${repo}". Available: ${available}` }],
          isError: true,
        };
      }

      const config = suites[suite];
      if (!config) {
        const available = Object.keys(suites).join(', ');
        return {
          content: [{ type: 'text' as const, text: `Unknown suite "${suite}" for repo "${repo}". Available: ${available}` }],
          isError: true,
        };
      }

      // Resolve workspace root: param → env → infer from MCP server's own location
      const wsRoot = params.workspaceRoot
        || process.env.WORKSPACE_ROOT
        || path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..', '..');

      const cwd = path.resolve(wsRoot, config.cwd);

      const header = [
        `Running: ${repo} — ${suite}`,
        `Description: ${config.description}`,
        `Command: ${config.cmd} ${config.args.join(' ')}${params.pattern ? ` --testPathPattern ${params.pattern}` : ''}`,
        `Working dir: ${cwd}`,
        '─'.repeat(60),
        '',
      ].join('\n');

      const { output, exitCode } = await runCommand(config.cmd, config.args, cwd, params.pattern);

      const footer = [
        '',
        '─'.repeat(60),
        `Exit code: ${exitCode} — ${exitCode === 0 ? 'PASSED' : 'FAILED'}`,
      ].join('\n');

      return {
        content: [{ type: 'text' as const, text: header + output + footer }],
        isError: exitCode !== 0,
      };
    }
  );
}
