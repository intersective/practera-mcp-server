import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { projectBriefService } from '../libs/project-brief-service.js';
import { loadWidgetHtml } from './widget-resource.js';

export const PROJECT_BRIEFS_WIDGET_URI = 'ui://practera/project-briefs-v1.html';

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
  idempotentHint: true,
} as const;

function publicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function briefUrl(id: string): string {
  return `${publicBaseUrl()}/briefs/${encodeURIComponent(id)}`;
}

export function registerChatGptPublicTools(server: McpServer): void {
  server.registerResource(
    'project-brief-results',
    PROJECT_BRIEFS_WIDGET_URI,
    {
      title: 'Practera project brief results',
      description: 'A visual comparison of experiential learning project briefs.',
      mimeType: 'text/html;profile=mcp-app',
    },
    async () => ({
      contents: [{
        uri: PROJECT_BRIEFS_WIDGET_URI,
        mimeType: 'text/html;profile=mcp-app',
        text: await loadWidgetHtml(),
        _meta: {
          ui: {
            prefersBorder: true,
            domain: process.env.WIDGET_DOMAIN || publicBaseUrl(),
            csp: {
              connectDomains: [],
              resourceDomains: [],
            },
          },
          'openai/widgetDescription':
            'Compares matching experiential learning project briefs, including duration, industry, skills, and deliverables.',
          'openai/widgetPrefersBorder': true,
        },
      }],
    })
  );

  server.registerTool(
    'search',
    {
      title: 'Search project briefs',
      description:
        'Use this when the user wants to find experiential learning project briefs by a skill, capability, or topic.',
      inputSchema: {
        query: z.string().min(1).max(200).describe('Skill, capability, or topic to search for.'),
      },
      annotations: readOnlyAnnotations,
      _meta: {
        'openai/toolInvocation/invoking': 'Searching project briefs…',
        'openai/toolInvocation/invoked': 'Project briefs found',
      },
    },
    async ({ query }) => {
      const briefs = await projectBriefService.searchBySkill(query, 10);
      const payload = {
        results: briefs.map((brief) => {
          const id = projectBriefService.getBriefId(brief);
          return {
            id,
            title: brief.project_title,
            url: briefUrl(id),
          };
        }),
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
      };
    }
  );

  server.registerTool(
    'fetch',
    {
      title: 'Fetch a project brief',
      description:
        'Use this when the user wants the full details of one project brief returned by search.',
      inputSchema: {
        id: z.string().min(1).max(240).describe('Project brief ID returned by search.'),
      },
      annotations: readOnlyAnnotations,
      _meta: {
        'openai/toolInvocation/invoking': 'Loading project brief…',
        'openai/toolInvocation/invoked': 'Project brief loaded',
      },
    },
    async ({ id }) => {
      const brief = await projectBriefService.getBriefById(id);
      if (!brief) {
        return {
          content: [{ type: 'text' as const, text: `Project brief not found: ${id}` }],
          isError: true,
        };
      }

      const payload = {
        id,
        title: brief.project_title,
        text: [
          brief.client_background,
          brief.problem_statement,
          brief.project_scope,
          brief.focus_area,
          `Deliverables: ${brief.deliverables.join('; ')}`,
        ].filter(Boolean).join('\n\n'),
        url: briefUrl(id),
        metadata: {
          industry: brief.industry,
          project_type: brief.project_type,
          duration_weeks: brief.duration_weeks,
          technical_skills: brief.technical_skills_required,
          professional_skills: brief.professional_skills_required,
        },
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
      };
    }
  );

  const renderedBriefSchema = z.object({
    id: z.string(),
    title: z.string(),
    url: z.string(),
    industry: z.string(),
    projectType: z.string(),
    durationWeeks: z.number(),
    technicalSkills: z.array(z.string()),
    professionalSkills: z.array(z.string()),
    deliverables: z.array(z.string()),
  });

  server.registerTool(
    'render_project_briefs',
    {
      title: 'Compare project briefs',
      description:
        'Use this to render a visual comparison after calling search. Pass the IDs returned by search; do not invent IDs.',
      inputSchema: {
        ids: z.array(z.string().min(1)).min(1).max(10)
          .describe('One to ten project brief IDs returned by search.'),
      },
      outputSchema: {
        view: z.literal('project_briefs'),
        briefs: z.array(renderedBriefSchema),
      },
      annotations: readOnlyAnnotations,
      _meta: {
        ui: { resourceUri: PROJECT_BRIEFS_WIDGET_URI },
        'openai/outputTemplate': PROJECT_BRIEFS_WIDGET_URI,
        'openai/toolInvocation/invoking': 'Preparing comparison…',
        'openai/toolInvocation/invoked': 'Comparison ready',
      },
    },
    async ({ ids }) => {
      const briefs = (await Promise.all(ids.map(async (id) => {
        const brief = await projectBriefService.getBriefById(id);
        if (!brief) return null;
        return {
          id,
          title: brief.project_title,
          url: briefUrl(id),
          industry: brief.industry,
          projectType: brief.project_type,
          durationWeeks: brief.duration_weeks,
          technicalSkills: brief.technical_skills_required,
          professionalSkills: brief.professional_skills_required,
          deliverables: brief.deliverables,
        };
      }))).filter((brief): brief is NonNullable<typeof brief> => brief !== null);

      const structuredContent = {
        view: 'project_briefs' as const,
        briefs,
      };

      return {
        structuredContent,
        content: [{
          type: 'text' as const,
          text: `Showing ${briefs.length} experiential learning project brief${briefs.length === 1 ? '' : 's'}.`,
        }],
      };
    }
  );
}
