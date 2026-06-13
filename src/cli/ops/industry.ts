/**
 * practera-ops industry — project brief commands.
 *
 * Commands:
 *   search <skill>         Search briefs by skill keyword
 *   brief <title>          Show full brief detail by title
 *   list [--limit n]       List all briefs (paginated)
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CliAuth } from '../auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the project_briefs.json relative to this file's compiled location.
// Compiled location: dist/cli/ops/industry.js → data is at dist/data/project_briefs.json
// Source location: src/cli/ops/industry.ts → data is at src/data/project_briefs.json
function loadBriefs(): Array<Record<string, unknown>> {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'data', 'project_briefs.json'),
    path.resolve(__dirname, '..', '..', '..', '..', 'src', 'data', 'project_briefs.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, 'utf-8'));
    }
  }
  throw new Error('project_briefs.json not found. Run `npm run build` in practera-mcp-server first.');
}

function output(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
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
    }
  }
  return flags;
}

export async function industryCommands(command: string, args: string[], _auth: CliAuth) {
  if (!command || command === 'help') {
    console.log(`
practera-ops industry <command>

Commands:
  search <skill>          Search briefs by skill keyword (case-insensitive)
  brief <title>           Show full brief by project title
  list [--limit <n>]      List all briefs (default limit: 20)
    `.trim());
    return;
  }

  const briefs = loadBriefs();

  switch (command) {
    case 'search': {
      if (!args[0]) throw new Error('Usage: industry search <skill>');
      const query = args.filter(a => !a.startsWith('--')).join(' ').toLowerCase();
      const flags = parseFlags(args);
      const limit = parseInt(flags['limit'] ?? '20', 10);

      const results = briefs.filter(b => {
        const haystack = JSON.stringify(b).toLowerCase();
        return haystack.includes(query);
      }).slice(0, limit);

      output(results.map(b => ({
        title: b['project_title'],
        industry: b['industry'],
        skills: b['skills'],
        duration: b['duration'],
        difficulty: b['difficulty'],
      })));
      console.error(`\n${results.length} results for "${query}" (showing up to ${limit})`);
      break;
    }

    case 'brief': {
      if (!args[0]) throw new Error('Usage: industry brief <title>');
      const title = args.filter(a => !a.startsWith('--')).join(' ');
      const brief = briefs.find(b =>
        String(b['project_title'] ?? '').toLowerCase() === title.toLowerCase()
      );
      if (!brief) {
        throw new Error(`Brief not found: "${title}". Use \`industry search <skill>\` to find titles.`);
      }
      output(brief);
      break;
    }

    case 'list': {
      const flags = parseFlags(args);
      const limit = parseInt(flags['limit'] ?? '20', 10);
      const page = parseInt(flags['page'] ?? '1', 10);
      const start = (page - 1) * limit;
      const slice = briefs.slice(start, start + limit);
      output(slice.map(b => ({
        title: b['project_title'],
        industry: b['industry'],
        skills: b['skills'],
      })));
      console.error(`\nPage ${page} of ${Math.ceil(briefs.length / limit)} (${briefs.length} total briefs)`);
      break;
    }

    default:
      throw new Error(`Unknown industry command: "${command}". Run \`practera-ops industry help\` for usage.`);
  }
}
