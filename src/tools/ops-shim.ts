/**
 * Thin MCP shim over the `practera-ops` GraphQL CLI.
 *
 * Exposes `ops_command` — a general-purpose shim that runs any
 * `practera-ops <group> <command> [...args]` invocation and returns the output.
 *
 * For agent use: prefer the dedicated author tools (create_experience, etc.) for
 * structured mutations. Use this shim for compound commands (scaffold-experience,
 * pm report) and any future CLI additions before they get dedicated tools.
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { spawn } from 'child_process';
import path from 'path';

function runCli(
  cliScript: string,
  args: string[],
  cwd: string,
  env: Record<string, string>
): Promise<{ output: string; exitCode: number }> {
  const MAX_OUTPUT_CHARS = 20_000;

  return new Promise((resolve) => {
    const proc = spawn('node', [cliScript, ...args], {
      cwd,
      env: { ...process.env, ...env },
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
        chunks.push('\n[... output truncated ...]');
        truncated = true;
      } else {
        chunks.push(str);
        totalLen += str.length;
      }
    };

    proc.stdout.on('data', collect);
    proc.stderr.on('data', collect);

    proc.on('close', (code) => resolve({ output: chunks.join(''), exitCode: code ?? 1 }));
    proc.on('error', (err) => resolve({ output: `Failed to start: ${err.message}`, exitCode: 1 }));
  });
}

export function registerOpsShimTool(server: McpServer) {
  server.tool(
    'ops_command',
    `Thin MCP shim over the practera-ops GraphQL CLI.
Run compound or reporting commands: \`designer scaffold-experience --name "X" --milestones 3\`, \`pm report 42\`, \`industry search "sustainability"\`.
Returns JSON output from the CLI.`,
    {
      group: z.enum(['designer', 'pm', 'industry']).describe(
        'Command group: designer (authoring), pm (reporting), industry (briefs)'
      ),
      command: z.string().describe(
        'Command to run within the group. E.g. "scaffold-experience", "report", "search"'
      ),
      args: z.array(z.string()).optional().describe(
        'Additional arguments passed to the CLI command. Flags like "--name", "--milestones 3" should each be a separate string.'
      ),
      apikey: z.string().optional().describe('Practera JWT (production)'),
      email: z.string().optional().describe('Email for devLogin (local/stage)'),
      region: z.string().optional().describe('Target region: local | stage | usa | aus | euk'),
      workspaceRoot: z.string().optional().describe(
        'Absolute path to workspace root. Falls back to WORKSPACE_ROOT env var.'
      ),
    },
    async (params) => {
      const wsRoot = params.workspaceRoot || process.env['WORKSPACE_ROOT'] ||
        path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..', '..');

      const cliScript = path.resolve(wsRoot, 'practera-mcp-server', 'dist', 'cli', 'ops', 'index.js');
      const cliArgs = [params.group, params.command, ...(params.args ?? [])];

      const env: Record<string, string> = {};
      if (params.apikey) env['PRACTERA_APIKEY'] = params.apikey;
      if (params.email) env['AUTH_EMAIL'] = params.email;
      if (params.region) env['PRACTERA_REGION'] = params.region;

      const { output, exitCode } = await runCli(cliScript, cliArgs, wsRoot, env);

      return {
        content: [{ type: 'text' as const, text: output }],
        isError: exitCode !== 0,
      };
    }
  );
}

export function registerDevShimTool(server: McpServer) {
  server.tool(
    'dev_command',
    `Thin MCP shim over the practera-dev local-tooling CLI.
Run developer commands: \`test integration --env local\`, \`login --email x@y.com\`, \`schema\`, \`status\`.
Returns stdout output from the CLI.`,
    {
      command: z.enum(['test', 'login', 'schema', 'status']).describe(
        'practera-dev command: test | login | schema | status'
      ),
      args: z.array(z.string()).optional().describe(
        'Arguments for the command. E.g. ["integration", "--env", "local"] for test'
      ),
      apikey: z.string().optional().describe('Practera JWT'),
      email: z.string().optional().describe('Email for devLogin'),
      region: z.string().optional().describe('Target region: local | stage | usa | aus | euk'),
      workspaceRoot: z.string().optional().describe(
        'Absolute path to workspace root. Falls back to WORKSPACE_ROOT env var.'
      ),
    },
    async (params) => {
      const wsRoot = params.workspaceRoot || process.env['WORKSPACE_ROOT'] ||
        path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..', '..');

      const cliScript = path.resolve(wsRoot, 'practera-mcp-server', 'dist', 'cli', 'dev', 'index.js');
      const cliArgs = [params.command, ...(params.args ?? [])];

      const env: Record<string, string> = { WORKSPACE_ROOT: wsRoot };
      if (params.apikey) env['PRACTERA_APIKEY'] = params.apikey;
      if (params.email) env['AUTH_EMAIL'] = params.email;
      if (params.region) env['PRACTERA_REGION'] = params.region;

      const { output, exitCode } = await runCli(cliScript, cliArgs, wsRoot, env);

      return {
        content: [{ type: 'text' as const, text: output }],
        isError: exitCode !== 0,
      };
    }
  );
}
