import {
  attendEvent,
  bookEvent,
  claimTodo,
  clientFrom,
  completeTodo,
  inviteExpert,
  markCommsRead,
  postChat,
  rateFeedback,
  readChat,
  rsvpEvent,
  submitPulse,
} from './tools/activity/actions.js';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const command = process.argv[2];

const commands: Record<string, (client: Awaited<ReturnType<typeof clientFrom>>) => Promise<unknown>> = {
  'post-chat': (client) => postChat(client, arg('channel') ?? '', arg('message') ?? ''),
  'read-chat': (client) => readChat(client),
  'invite-expert': (client) => inviteExpert(client, arg('channel') ?? '', Number(arg('expert'))),
  'book-event': (client) => bookEvent(client, arg('event') ?? ''),
  'rsvp-event': (client) => rsvpEvent(client, Number(arg('event')), Number(arg('user')), arg('status') ?? 'yes'),
  'attend-event': (client) => attendEvent(client, Number(arg('event'))),
  'claim-todo': (client) => claimTodo(client, Number(arg('item'))),
  'complete-todo': (client) => completeTodo(client, Number(arg('item'))),
  'submit-pulse': (client) => submitPulse(client, arg('team') ? Number(arg('team')) : undefined, JSON.parse(arg('answers') ?? '[]')),
  'rate-feedback': (client) => rateFeedback(client, arg('review') ?? '', Number(arg('rating'))),
  'mark-comms-read': (client) => markCommsRead(client, (arg('ids') ?? '').split(',').filter(Boolean).map(Number)),
};

async function main() {
  const run = command ? commands[command] : undefined;
  if (!run) {
    console.error(`Usage: practera-activity <${Object.keys(commands).join('|')}> --apikey <jwt> | --email <address>`);
    process.exit(1);
  }
  const client = await clientFrom({ apikey: arg('apikey'), email: arg('email'), region: arg('region') });
  const result = await run(client);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
