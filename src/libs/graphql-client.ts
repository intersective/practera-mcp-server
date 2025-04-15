import { GraphQLClient } from 'graphql-request';
import { PracteraAuth } from '../auth.js';

// Region-specific API endpoints
export const PRACTERA_ENDPOINTS: Record<string, string> = {
  usa: 'https://core-graphql-api.usa.practera.com/',
  aus: 'https://core-graphql-api.aus.practera.com/',
  euk: 'https://core-graphql-api.euk.practera.com/',
  // Stage endpoint for development
  stage: 'https://core-graphql-api.p2-stage.practera.com/'
};

/**
 * Helper function to create GraphQL client with support for both API key and OAuth
 */
export function createGraphQLClient(authConfig: any, region: string) {
  const endpoint = PRACTERA_ENDPOINTS[region.toLowerCase()] || PRACTERA_ENDPOINTS.stage;

  // Create auth helper - handles both API key and OAuth token
  const auth = authConfig instanceof PracteraAuth 
    ? authConfig 
    : (typeof authConfig === 'string' 
      ? new PracteraAuth({ apikey: authConfig, appkey: '', accessToken: '' }) 
      : new PracteraAuth(authConfig));
  
  // Cast headers to unknown first to avoid type issues with GraphQLClient
  return new GraphQLClient(endpoint, {
    headers: auth.getHeaders() as unknown as Record<string, string>
  });
} 