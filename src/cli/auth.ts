/**
 * CLI auth helper — shared between practera-ops and practera-dev CLIs.
 * Thin wrapper over the MCP server's createAuthenticatedClient.
 */
export { createAuthenticatedClient } from '../libs/auth-helper.js';

export interface CliAuth {
  region: string;
  apikey?: string;
  email?: string;
}
