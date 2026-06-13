#!/usr/bin/env node
/**
 * practera-ops — agent-native CLI for Practera ops personas.
 *
 * Persona command groups:
 *   designer   — authoring CRUD + compound scaffold commands
 *   pm         — metrics, cohort reports, enrolment analysis (NET-NEW)
 *   industry   — project brief search and detail
 *
 * Usage:
 *   practera-ops designer list-experiences
 *   practera-ops designer scaffold-experience --name "My Program" --milestones 3
 *   practera-ops designer export-experience <experienceId>
 *   practera-ops designer import-experience <file.json>
 *   practera-ops pm report <experienceId>
 *   practera-ops pm cohort-summary [experienceId]
 *   practera-ops industry search <skill>
 *   practera-ops industry brief <title>
 *   practera-ops help
 *
 * Auth:
 *   PRACTERA_APIKEY=<jwt>   — direct (all envs)
 *   AUTH_EMAIL=<email>      — devLogin (local/stage only)
 *   PRACTERA_REGION=<env>   — default: local
 */

import { createAuthenticatedClient } from '../auth.js';
import { designerCommands } from './designer.js';
import { pmCommands } from './pm.js';
import { industryCommands } from './industry.js';

const USAGE = `
practera-ops <group> <command> [options]

Groups:
  designer    Authoring: create, scaffold, import, export programs
  pm          Program management: reports, cohort metrics, enrolment
  industry    Industry briefs: search and view project briefs
  help        Show this help

Environment variables:
  PRACTERA_REGION    Target env: local | stage | usa | aus | euk  (default: local)
  PRACTERA_APIKEY    JWT for authenticated calls (required for non-local envs)
  AUTH_EMAIL         Email for devLogin (local/stage only, alternative to PRACTERA_APIKEY)
`.trim();

async function main() {
  const args = process.argv.slice(2);
  const [group, command, ...rest] = args;

  if (!group || group === 'help' || group === '--help' || group === '-h') {
    console.log(USAGE);
    process.exit(0);
  }

  const auth = {
    region: process.env['PRACTERA_REGION'] ?? 'local',
    apikey: process.env['PRACTERA_APIKEY'] || undefined,
    email: process.env['AUTH_EMAIL'] || undefined,
  };

  try {
    switch (group) {
      case 'designer':
        await designerCommands(command, rest, auth);
        break;
      case 'pm':
        await pmCommands(command, rest, auth);
        break;
      case 'industry':
        await industryCommands(command, rest, auth);
        break;
      default:
        console.error(`Unknown group: "${group}". Run \`practera-ops help\` for usage.`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
