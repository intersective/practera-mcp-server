import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export function registerSubmitAssessmentTool(server: McpServer) {
  server.tool(
    'submit_assessment',
    'Submit an assessment finalising all answers. Requires the submissionId from get_or_create_submission, the assessmentId, and the contextId. Optionally pass inline answers to save and submit in one step.',
    {
      apikey: z.string().optional(),
      email: z.string().optional(),
      region: z.string().optional(),
      submissionId: z.number().describe('ID of the in-progress submission to finalise.'),
      assessmentId: z.number().describe('ID of the assessment being submitted.'),
      contextId: z.number().describe('Context ID linking the assessment to its activity.'),
      answers: z
        .array(
          z.object({
            questionId: z.number(),
            answer: z.string().optional(),
            choiceId: z.number().optional(),
          }),
        )
        .optional()
        .describe('Optional inline answers to save alongside submission. If omitted, uses previously saved answers.'),
    },
    async (params) => {
      try {
        const client = await createAuthenticatedClient({
          apikey: params.apikey,
          email: params.email,
          region: params.region,
        });
        const mutation = `
          mutation SubmitAssessment(
            $submissionId: Int!
            $assessmentId: Int!
            $contextId: Int!
            $answers: [SubmissionAnswerInput]
          ) {
            submitAssessment(
              submissionId: $submissionId
              assessmentId: $assessmentId
              contextId: $contextId
              answers: $answers
            ) { id status }
          }
        `;
        const data: any = await client.request(mutation, {
          submissionId: params.submissionId,
          assessmentId: params.assessmentId,
          contextId: params.contextId,
          answers: params.answers,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data.submitAssessment, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );
}
