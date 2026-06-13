#!/usr/bin/env node
/**
 * practera-dev — agent-native CLI for developer tooling.
 *
 * This CLI wraps practera-test-suite for test orchestration and adds
 * local-dev utilities: devLogin, GraphQL schema introspection, and
 * workspace status.
 *
 * Commands:
 *   test <suite> [--env <env>] [--ci]   Delegate to practera-test-suite CLI
 *   login [--email <e>] [--region <r>]  devLogin and print JWT
 *   schema [--region <r>]               Print GraphQL schema (introspection)
 *   status                              Show workspace repo + service status
 *   help                                Show this help
 *
 * Auth:
 *   PRACTERA_APIKEY=<jwt>   — direct (all envs)
 *   AUTH_EMAIL=<email>      — devLogin (local/stage only)
 *   PRACTERA_REGION=<env>   — default: local
 *   WORKSPACE_ROOT=<path>   — workspace dir (parent of all repos)
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { createAuthenticatedClient, CliAuth } from '../auth.js';

const USAGE = `
practera-dev <command> [options]

Commands:
  test <suite> [--env <env>] [--ci]   Run a test suite via practera-test-suite
                                       Suites: integration | functional | browser | security | load | all
  login [--email <email>] [--region <r>]   Obtain a JWT via devLogin and print it
  schema [--region <r>]               Print the GraphQL schema via introspection
  status                              Show workspace repo and service URLs
  help                                Show this help

Environment:
  PRACTERA_REGION    Target env: local | stage | usa | aus | euk  (default: local)
  PRACTERA_APIKEY    JWT (required for non-local envs)
  AUTH_EMAIL         Email for devLogin (local/stage only)
  WORKSPACE_ROOT     Absolute path to workspace root (parent of all repos)
`.trim();

function parseFlags(args: string[]): { flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function resolveWorkspaceRoot(): string {
  return process.env['WORKSPACE_ROOT'] ??
    path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..', '..', '..');
}

async function main() {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  switch (command) {
    case 'test': {
      const { flags, positional } = parseFlags(rest);
      const suite = positional[0];
      if (!suite) {
        console.error('Usage: practera-dev test <suite> [--env local|stage] [--ci]');
        console.error('Suites: integration | functional | browser | security | load | all');
        process.exit(1);
      }

      const env = flags['env'] ?? process.env['PRACTERA_REGION'] ?? 'local';
      const wsRoot = resolveWorkspaceRoot();
      const suiteCwd = path.join(wsRoot, 'practera-test-suite');

      const npxArgs = ['practera-test', suite, '--env', env];
      if (flags['ci'] === 'true' || flags['ci'] === '') npxArgs.push('--ci');

      console.log(`Delegating to practera-test-suite: npx ${npxArgs.join(' ')}`);
      console.log(`Working dir: ${suiteCwd}`);

      const proc = spawn('npx', npxArgs, {
        cwd: suiteCwd,
        stdio: 'inherit',
        env: { ...process.env },
      });

      proc.on('close', (code) => process.exit(code ?? 0));
      proc.on('error', (err) => {
        console.error(`Failed to run practera-test: ${err.message}`);
        console.error(`Make sure practera-test-suite is installed: cd ${suiteCwd} && pnpm install`);
        process.exit(1);
      });
      break;
    }

    case 'login': {
      const { flags } = parseFlags(rest);
      const auth: CliAuth = {
        region: flags['region'] ?? process.env['PRACTERA_REGION'] ?? 'local',
        email: flags['email'] ?? process.env['AUTH_EMAIL'],
        apikey: process.env['PRACTERA_APIKEY'] || undefined,
      };

      const client = await createAuthenticatedClient(auth);

      // Use devLogin to get a fresh JWT and print it
      const email = auth.email;
      if (!email && !auth.apikey) {
        throw new Error('Set AUTH_EMAIL (or --email) or PRACTERA_APIKEY for login');
      }

      if (auth.apikey) {
        console.log(auth.apikey);
      } else {
        const query = `mutation DevLogin($email: String!) { devLogin(email: $email) { apikey } }`;
        const data = await client.request<{ devLogin: { apikey: string } }>(query, { email });
        console.log(data.devLogin.apikey);
      }
      break;
    }

    case 'schema': {
      const { flags } = parseFlags(rest);
      const auth: CliAuth = {
        region: flags['region'] ?? process.env['PRACTERA_REGION'] ?? 'local',
        apikey: process.env['PRACTERA_APIKEY'] || undefined,
        email: process.env['AUTH_EMAIL'] || undefined,
      };

      const client = await createAuthenticatedClient(auth);

      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            types {
              name
              kind
              description
              fields(includeDeprecated: false) {
                name
                description
                type { name kind ofType { name kind } }
                args { name type { name kind ofType { name kind } } }
              }
            }
          }
        }
      `;

      const data = await client.request<{ __schema: unknown }>(introspectionQuery);
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'status': {
      const wsRoot = resolveWorkspaceRoot();
      const repos = [
        'practera-admin', 'practera-login-api', 'practera-login-app',
        'practera-graphql-api', 'practera-app', 'practera-mcp-server',
        'practera-test-suite', 'practera-devops-center',
      ];

      console.log(`Workspace: ${wsRoot}\n`);

      for (const repo of repos) {
        const repoPath = path.join(wsRoot, repo);
        const { existsSync, readFileSync } = await import('node:fs');
        if (!existsSync(repoPath)) {
          console.log(`  ${repo.padEnd(30)} not found`);
          continue;
        }
        const pkgPath = path.join(repoPath, 'package.json');
        let version = '';
        if (existsSync(pkgPath)) {
          try { version = `v${JSON.parse(readFileSync(pkgPath, 'utf-8')).version ?? '?'}`; } catch { }
        }
        const cargoPath = path.join(repoPath, 'Cargo.toml');
        if (!version && existsSync(cargoPath)) version = 'rust';
        console.log(`  ${repo.padEnd(30)} ${version || 'present'}`);
      }

      console.log('\nService URLs (local stack):');
      console.log('  GraphQL API    http://localhost:8000');
      console.log('  Login API      http://localhost:3200');
      console.log('  Login App      http://localhost:3100');
      console.log('  App V2         http://localhost:4200');
      console.log('  Admin          http://localhost:8080');
      break;
    }

    default:
      console.error(`Unknown command: "${command}". Run \`practera-dev help\` for usage.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
