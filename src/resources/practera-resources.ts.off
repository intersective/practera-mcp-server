import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createGraphQLClient } from "../libs/graphql-client.js";
import { projectBriefService } from "../libs/project-brief-service.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
// Define the expected request interface based on MCP spec
interface ResourceRequest {
  uri: URL;
  variables?: Record<string, string>;
  extra?: {
    auth?: {
      apiKey?: string;
    };
  };
}

/**
 * Registers Practera-specific resources with the MCP server.
 */
export function registerPracteraResources(server: McpServer) {
  // Current Project Resource (static URI)
  server.resource(
    "currentProject",
    "practera://project/current",
    async (uri) => {
      const region = "usa"; // TODO: Get from client context
      const apikey = ""; // Default empty API key if not provided

      try {
        const client = createGraphQLClient({ apikey }, region);
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
      
      const region = "usa"; // TODO: Get from client context
      const apikey = ""; // Default empty API key if not provided

      try {
        const client = createGraphQLClient({ apikey }, region);
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

// Example of what the implementation might look like:
/*
server.resource("resourceName", 
  "resource://uri/pattern",
  async (request) => {
    // Fetch data
    return {
      contents: [{
        uri: request.uri.toString(),
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2)
      }]
    };
  }
);
*/ 