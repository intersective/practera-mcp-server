/**
 * practera-ops designer — authoring commands.
 *
 * Commands:
 *   list-experiences                         List all experiences
 *   get-experience <id>                      Full project tree for an experience
 *   scaffold-experience                      Compound: create experience + milestones + activities
 *   export-experience <id>                   Export experience as JSON
 *   import-experience <file>                 Import experience from JSON file
 *   create-milestone <experienceId>          Add a milestone
 *   create-activity <milestoneId>            Add an activity to a milestone
 */

import * as fs from 'node:fs';
import { createAuthenticatedClient, CliAuth } from '../auth.js';

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

function output(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

export async function designerCommands(command: string, args: string[], auth: CliAuth) {
  if (!command || command === 'help') {
    console.log(`
practera-ops designer <command>

Commands:
  list-experiences                         List all experiences
  get-experience <id>                      Full project tree for an experience
  scaffold-experience --name <n> [--milestones <n>] [--institutionId <id>]
                                           Compound: create exp + N milestones
  export-experience <id>                   Export experience JSON
  import-experience <file.json>            Import experience JSON
  create-milestone <experienceId> --name <n>
  create-activity <milestoneId> --name <n>
    `.trim());
    return;
  }

  const client = await createAuthenticatedClient(auth);

  switch (command) {
    case 'list-experiences': {
      const data = await client.request<{ experiences: Array<{ id: number; name: string; status: string }> }>(
        `query { experiences { id name status } }`
      );
      output(data.experiences);
      break;
    }

    case 'get-experience': {
      const [id] = args;
      if (!id) throw new Error('Usage: get-experience <id>');
      const data = await client.request<{ project: unknown }>(
        `query { project { id name milestones { id name description activities { id name description tasks { id name type } } } } }`
      );
      output(data.project);
      break;
    }

    case 'scaffold-experience': {
      const flags = parseFlags(args);
      const name = flags['name'];
      if (!name) throw new Error('Usage: scaffold-experience --name "Program Name" [--milestones 3] [--institutionId <id>]');
      const milestoneCount = parseInt(flags['milestones'] ?? '3', 10);
      const institutionId = flags['institutionId'] ? parseInt(flags['institutionId'], 10) : undefined;

      console.log(`Creating experience: "${name}" with ${milestoneCount} milestones...`);

      // Step 1: Create experience
      const expData = await client.request<{ createExperience: { id: number; name: string } }>(
        `mutation CreateExperience($name: String!, $institutionId: Int) {
           createExperience(name: $name, institutionId: $institutionId) { id name }
         }`,
        { name, institutionId }
      );
      const experience = expData.createExperience;
      console.log(`  ✓ Created experience: ${experience.name} (id=${experience.id})`);

      // Step 2: Create milestones
      const milestones = [];
      for (let i = 1; i <= milestoneCount; i++) {
        const milestoneName = `Milestone ${i}`;
        const msData = await client.request<{ createMilestone: { id: number; name: string } }>(
          `mutation CreateMilestone($experienceId: Int!, $name: String!) {
             createMilestone(experienceId: $experienceId, name: $name) { id name }
           }`,
          { experienceId: experience.id, name: milestoneName }
        );
        const milestone = msData.createMilestone;
        console.log(`  ✓ Created milestone: ${milestone.name} (id=${milestone.id})`);
        milestones.push(milestone);
      }

      output({
        experience,
        milestones,
        message: `Scaffold complete. Use 'designer create-activity <milestoneId> --name "Activity Name"' to add activities.`,
      });
      break;
    }

    case 'export-experience': {
      const [id] = args;
      if (!id) throw new Error('Usage: export-experience <id>');
      const data = await client.request<{ exportExperience: unknown }>(
        `mutation ExportExperience($id: Int!) { exportExperience(id: $id) }`,
        { id: parseInt(id, 10) }
      );
      output(data.exportExperience);
      break;
    }

    case 'import-experience': {
      const [filePath] = args;
      if (!filePath) throw new Error('Usage: import-experience <file.json>');
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      const flags = parseFlags(args.slice(1));
      const institutionId = flags['institutionId'] ? parseInt(flags['institutionId'], 10) : undefined;

      const data = await client.request<{ importExperienceData: unknown }>(
        `mutation ImportExperience($data: String!, $institutionId: Int) {
           importExperienceData(data: $data, institutionId: $institutionId)
         }`,
        { data: JSON.stringify(json), institutionId }
      );
      output(data.importExperienceData);
      break;
    }

    case 'create-milestone': {
      const [experienceId, ...milestoneArgs] = args;
      if (!experienceId) throw new Error('Usage: create-milestone <experienceId> --name "Milestone Name"');
      const flags = parseFlags(milestoneArgs);
      const name = flags['name'];
      if (!name) throw new Error('--name is required');
      const data = await client.request<{ createMilestone: unknown }>(
        `mutation CreateMilestone($experienceId: Int!, $name: String!) {
           createMilestone(experienceId: $experienceId, name: $name) { id name }
         }`,
        { experienceId: parseInt(experienceId, 10), name }
      );
      output(data.createMilestone);
      break;
    }

    case 'create-activity': {
      const [milestoneId, ...activityArgs] = args;
      if (!milestoneId) throw new Error('Usage: create-activity <milestoneId> --name "Activity Name"');
      const flags = parseFlags(activityArgs);
      const name = flags['name'];
      if (!name) throw new Error('--name is required');
      const data = await client.request<{ createActivity: unknown }>(
        `mutation CreateActivity($milestoneId: Int!, $name: String!) {
           createActivity(milestoneId: $milestoneId, name: $name) { id name }
         }`,
        { milestoneId: parseInt(milestoneId, 10), name }
      );
      output(data.createActivity);
      break;
    }

    default:
      throw new Error(`Unknown designer command: "${command}". Run \`practera-ops designer help\` for usage.`);
  }
}
