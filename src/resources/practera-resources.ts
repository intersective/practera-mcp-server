import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAuthenticatedClient } from "../libs/auth-helper.js";
import { projectBriefService } from "../libs/project-brief-service.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Resolve region and apikey from env for resource handlers.
 * Resources don't receive per-request params, so we fall back to env vars.
 * For proper multi-tenant resource auth, prefer the tool surface (which accepts apikey/email params).
 */
function getResourceAuth(): { region: string; apikey?: string; email?: string } {
  return {
    region: process.env.PRACTERA_REGION ?? "usa",
    apikey: process.env.PRACTERA_APIKEY || undefined,
    email: process.env.AUTH_EMAIL || undefined,
  };
}

/**
 * Registers Practera-specific resources with the MCP server.
 *
 * NOTE: Resources use env-based auth (PRACTERA_REGION + PRACTERA_APIKEY / AUTH_EMAIL).
 * For per-request auth, use the tool surface (tools accept apikey/email params directly).
 */
export function registerPracteraResources(server: McpServer) {
  // Current Project Resource (static URI)
  server.resource(
    "currentProject",
    "practera://project/current",
    async (uri) => {
      const auth = getResourceAuth();

      try {
        const client = await createAuthenticatedClient(auth);
        const query = `
          query project {
            project { id name milestones { id name description isLocked activities { id name description instructions isLocked leadImage tasks { id name type isLocked isTeam deadline contextId assessmentType } } } }
          }
        `;
        const data = await client.request(query);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error reading resource ${uri}:`, error);
        throw new Error(`Failed to fetch project: ${error}`);
      }
    }
  );

  // Assessment Resource Template
  server.resource(
    "assessments",
    new ResourceTemplate("practera://assessments/{assessmentId}", { list: undefined }),
    async (uri, variables) => {
      const { assessmentId } = variables;
      if (!assessmentId) {
        throw new Error("Assessment ID is required");
      }
      
      const auth = getResourceAuth();

      try {
        const client = await createAuthenticatedClient(auth);
        const query = `
          query GetAssessment($id: Int!) {
            assessment(id: $id, reviewer: false) { id name description type dueDate isTeam pulseCheck groups { name description questions { id name description type isRequired hasComment audience fileType choices { id name description explanation } } } }
          }
        `;
        const gqlVariables = { id: parseInt(assessmentId.toString()) };
        const data = await client.request(query, gqlVariables);
        
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error reading resource ${uri}:`, error);
        throw new Error(`Failed to fetch assessment ${assessmentId}: ${error}`);
      }
    }
  );

  // Project Brief Resource Template
  server.resource(
    "briefs",
    new ResourceTemplate("practera://briefs/{briefId}", { list: undefined }),
    async (uri, variables) => {
      const { briefId } = variables;
      if (!briefId) {
        throw new Error("Brief ID is required");
      }

      try {
        await projectBriefService.initialize(); // Ensure briefs are loaded
        const briefs = await projectBriefService.getAllBriefs(1000); // Get all briefs
        const brief = briefs.find((b) => b.project_title === briefId);

        if (!brief) {
          throw new Error(`Project brief with title ${briefId} not found.`);
        }

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: "application/json",
              text: JSON.stringify(brief, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(`Error reading resource ${uri}:`, error);
        throw new Error(`Failed to fetch project brief ${briefId}: ${error}`);
      }
    }
  );
}
