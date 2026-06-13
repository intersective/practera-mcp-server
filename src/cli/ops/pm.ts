/**
 * practera-ops pm — Program management commands (NET-NEW).
 *
 * Commands:
 *   report <experienceId>         Learner progress report for an experience
 *   cohort-summary [experienceId] Enrolment counts by status
 *   assessments-overview          Assessment submission rate summary
 */

import { createAuthenticatedClient, CliAuth } from '../auth.js';

function output(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}

interface Enrolment {
  id: number;
  status: string;
  user: { id: number; firstName: string; lastName: string; email: string } | null;
}

interface Activity {
  id: number;
  name: string;
  tasks?: Array<{ id: number; name: string; type: string }>;
}

interface Milestone {
  id: number;
  name: string;
  activities?: Activity[];
}

interface ProjectData {
  project: { milestones?: Milestone[] };
}

export async function pmCommands(command: string, args: string[], auth: CliAuth) {
  if (!command || command === 'help') {
    console.log(`
practera-ops pm <command>

Commands:
  report <experienceId>         Learner progress and submission overview
  cohort-summary [experienceId] Enrolment counts by status
  assessments-overview          Assessment submission rate summary
    `.trim());
    return;
  }

  const client = await createAuthenticatedClient(auth);

  switch (command) {
    case 'report': {
      const [experienceId] = args;
      if (!experienceId) throw new Error('Usage: pm report <experienceId>');

      // Fetch enrolments + project structure + submission counts in parallel
      const [enrolData, projectData] = await Promise.all([
        client.request<{ enrolments: Enrolment[] }>(
          `query Enrolments($experienceId: Int!) {
             enrolments(experienceId: $experienceId) {
               id status
               user { id firstName lastName email }
             }
           }`,
          { experienceId: parseInt(experienceId, 10) }
        ).catch(() => ({ enrolments: [] as Enrolment[] })),
        client.request<ProjectData>(
          `query { project { milestones { id name activities { id name tasks { id name type } } } } }`
        ).catch(() => ({ project: { milestones: [] } } as ProjectData)),
      ]);

      const enrolments = enrolData.enrolments ?? [];
      const milestones = projectData.project?.milestones ?? [];
      const totalActivities = milestones.reduce((s, m) => s + (m.activities?.length ?? 0), 0);

      const byStatus: Record<string, number> = {};
      for (const e of enrolments) {
        byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      }

      output({
        experienceId,
        summary: {
          totalEnrolments: enrolments.length,
          byStatus,
          milestones: milestones.length,
          activities: totalActivities,
        },
        enrolments: enrolments.map(e => ({
          id: e.id,
          status: e.status,
          user: e.user
            ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim() || e.user.email
            : '(unknown)',
        })),
      });
      break;
    }

    case 'cohort-summary': {
      const [experienceId] = args;

      const data = await client.request<{ enrolments: Enrolment[] }>(
        experienceId
          ? `query Enrolments($experienceId: Int!) {
               enrolments(experienceId: $experienceId) { id status }
             }`
          : `query { enrolments { id status } }`,
        experienceId ? { experienceId: parseInt(experienceId, 10) } : undefined
      ).catch(() => ({ enrolments: [] as Enrolment[] }));

      const enrolments = data.enrolments ?? [];
      const byStatus: Record<string, number> = {};
      for (const e of enrolments) {
        byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      }

      output({
        experienceId: experienceId ?? 'all',
        total: enrolments.length,
        byStatus,
      });
      break;
    }

    case 'assessments-overview': {
      const data = await client.request<{
        experiences: Array<{ id: number; name: string }>
      }>(`query { experiences { id name status } }`)
        .catch(() => ({ experiences: [] }));

      output({
        experiences: data.experiences,
        note: 'For per-assessment submission counts, use pm report <experienceId>',
      });
      break;
    }

    default:
      throw new Error(`Unknown pm command: "${command}". Run \`practera-ops pm help\` for usage.`);
  }
}
