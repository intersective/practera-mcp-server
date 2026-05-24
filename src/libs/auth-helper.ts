import { GraphQLClient } from 'graphql-request';
import { PRACTERA_ENDPOINTS } from './graphql-client.js';

/**
 * Authenticates via devLogin mutation (local dev) or uses provided apikey.
 * Returns a GraphQLClient ready to use for author/student/reviewer mutations.
 */
export async function createAuthenticatedClient(params: {
  apikey?: string;
  email?: string;
  region?: string;
}): Promise<GraphQLClient> {
  const region = params.region || process.env.PRACTERA_REGION || 'local';
  const endpoint = PRACTERA_ENDPOINTS[region.toLowerCase()] || PRACTERA_ENDPOINTS.local;

  if (params.apikey) {
    return new GraphQLClient(endpoint, {
      headers: { apikey: params.apikey } as Record<string, string>,
    });
  }

  const email = params.email || process.env.AUTH_EMAIL;
  if (!email) {
    throw new Error('Either apikey or email (for devLogin) is required');
  }

  if (region !== 'local' && region !== 'stage') {
    throw new Error('devLogin is only available for local/stage environments. Provide an apikey for production regions.');
  }

  const anonClient = new GraphQLClient(endpoint);
  const query = `
    mutation DevLogin($email: String!) {
      devLogin(email: $email) {
        apikey
        email
        unregistered
      }
    }
  `;
  const data: any = await anonClient.request(query, { email });
  const apikey = data?.devLogin?.apikey;
  if (!apikey) throw new Error(`devLogin failed for ${email}`);

  return new GraphQLClient(endpoint, {
    headers: { apikey } as Record<string, string>,
  });
}
