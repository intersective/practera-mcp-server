import { GraphQLClient } from 'graphql-request';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createAuthenticatedClient } from '../../libs/auth-helper.js';

export const authShape = {
  apikey: z.string().optional(),
  email: z.string().optional(),
  region: z.string().optional(),
};

export async function clientFrom(params: { apikey?: string; email?: string; region?: string }) {
  return createAuthenticatedClient(params);
}

async function call(client: GraphQLClient, query: string, variables?: Record<string, unknown>) {
  return client.request(query, variables);
}

export async function postChat(client: GraphQLClient, channelUuid: string, message: string) {
  return call(client, `mutation Chat($input: CreateChatLogInput!) { createChatLog(input: $input) { uuid } }`, {
    input: { channelUuid, message },
  });
}

export async function readChat(client: GraphQLClient) {
  return call(client, `query { channels { uuid name chatLogsConnection { chatLogs { message } } } }`);
}

export async function inviteExpert(client: GraphQLClient, channelUuid: string, expertId: number) {
  return call(client, `mutation Invite($channelUuid: ID!, $expertId: Int!) { addAiExpertToChannel(channelUuid: $channelUuid, expertId: $expertId) { uuid } }`, {
    channelUuid, expertId,
  });
}

export async function bookEvent(client: GraphQLClient, eventId: string) {
  return call(client, `mutation Book($eventId: ID!) { bookEvent(eventId: $eventId) { success message } }`, { eventId });
}

export async function rsvpEvent(client: GraphQLClient, eventId: number, userId: number, status: string) {
  return call(client, `mutation Rsvp($eventId: Int!, $userId: Int!, $status: String!) { updateRsvpStatus(eventId: $eventId, userId: $userId, status: $status) { success message } }`, {
    eventId, userId, status,
  });
}

export async function attendEvent(client: GraphQLClient, eventId: number) {
  return call(client, `mutation Attend($eventId: Int!) { recordEventAttendance(eventId: $eventId) { success message } }`, { eventId });
}

export async function claimTodo(client: GraphQLClient, itemId: number) {
  return call(client, `mutation Claim($itemId: Int!) { claimTodoItem(itemId: $itemId) { title } }`, { itemId });
}

export async function completeTodo(client: GraphQLClient, itemId: number) {
  return call(client, `mutation Done($itemId: Int!) { completeTodoItem(itemId: $itemId) { title } }`, { itemId });
}

export async function submitPulse(client: GraphQLClient, teamId: number | undefined, answers: Array<{ questionId: number; choiceId: number }>) {
  return call(client, `mutation Pulse($teamId: Int, $answers: [PulseCheckAnswerInput!]) { submitPulseCheck(teamId: $teamId, answers: $answers) }`, {
    teamId, answers,
  });
}

export async function rateFeedback(client: GraphQLClient, assessmentReviewId: string, rating: number) {
  return call(client, `mutation Rate($assessmentReviewId: ID!, $rating: Float!) { submitReviewRating(assessmentReviewId: $assessmentReviewId, rating: $rating) { success message } }`, {
    assessmentReviewId, rating,
  });
}

export async function markCommsRead(client: GraphQLClient, ids: number[]) {
  return call(client, `mutation Seen($ids: [Int!]!) { markNotificationLogsSeen(ids: $ids) { success message } }`, { ids });
}

function tool(server: McpServer, name: string, description: string, shape: Record<string, z.ZodTypeAny>, run: (params: any, client: GraphQLClient) => Promise<unknown>) {
  server.tool(name, description, { ...authShape, ...shape }, async (params) => {
    try {
      const client = await clientFrom(params);
      const data = await run(params, client);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { content: [{ type: 'text' as const, text: err instanceof Error ? err.message : String(err) }], isError: true };
    }
  });
}

export function registerActivityTools(server: McpServer) {
  tool(server, 'post_chat', 'Post a message in a team or direct channel.', {
    channelUuid: z.string(),
    message: z.string(),
  }, (params, client) => postChat(client, params.channelUuid, params.message));

  tool(server, 'read_chat', 'Read recent messages on the channels this user belongs to.', {}, (_params, client) => readChat(client));

  tool(server, 'invite_ai_expert', 'Invite an AI expert into a channel. This is the experience expert, not the global companion.', {
    channelUuid: z.string(),
    expertId: z.number(),
  }, (params, client) => inviteExpert(client, params.channelUuid, params.expertId));

  tool(server, 'book_event', 'Book an event for the current user.', { eventId: z.string() }, (params, client) => bookEvent(client, params.eventId));

  tool(server, 'rsvp_event', 'Set RSVP status (yes, no, unknown) for a user on an event.', {
    eventId: z.number(),
    userId: z.number(),
    status: z.string(),
  }, (params, client) => rsvpEvent(client, params.eventId, params.userId, params.status));

  tool(server, 'attend_event', 'Record that the current user attended an event.', { eventId: z.number() }, (params, client) => attendEvent(client, params.eventId));

  tool(server, 'claim_todo', 'Claim a shared todo item.', { itemId: z.number() }, (params, client) => claimTodo(client, params.itemId));

  tool(server, 'complete_todo', 'Mark a todo item complete.', { itemId: z.number() }, (params, client) => completeTodo(client, params.itemId));

  tool(server, 'submit_pulse', 'Submit a pulse check. answers is questionId and choiceId pairs.', {
    teamId: z.number().optional(),
    answers: z.array(z.object({ questionId: z.number(), choiceId: z.number() })),
  }, (params, client) => submitPulse(client, params.teamId, params.answers));

  tool(server, 'rate_feedback', 'Record helpfulness for a review. rating is 0 to 1.', {
    assessmentReviewId: z.string(),
    rating: z.number(),
  }, (params, client) => rateFeedback(client, params.assessmentReviewId, params.rating));

  tool(server, 'mark_comms_read', 'Mark in-app notification logs as seen.', {
    ids: z.array(z.number()),
  }, (params, client) => markCommsRead(client, params.ids));
}
