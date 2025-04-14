# Practera MCP Server

An MCP (Model Context Protocol) server that provides access to Practera's GraphQL API, allowing AI models to query Practera learning data.

## Why Practera MCP?

With this MCP server, you can use LLMs to analyze Practera projects and assessments. For now, this is only available to learning designers (author users). 

Here are some examples of how you can use this MCP server:
- Analyze the structure of a project and look for how it can be extended, compressed.
- Restructure the project for different grade levels or different audiences.
- Evaluate the assessments in the project and look for how they can be improved.
- Generate project blueprints and templates.
- Generate assessments and questions
- Create a common cartridge version of a project, or import projects from other LMS data files.

## Roadmap

[ ] Support metrics API for generating LLM reports
[ ] Support OAuth 2.1 for secure access
[ ] Support dynamic creation of assessments, milestones, activities, tasks
[ ] Support generation of media assets
[ ] Dynamic resource/tool/prompt selection based on project context


## Features

- Server-Sent Events (SSE) transport for MCP
- AWS Lambda deployment support
- GraphQL integration with Practera API
- Region-specific endpoints
- API key authentication
- OAuth 2.1 support for secure access

## Prerequisites

- Node.js 18+
- npm
- AWS account (for deployment)
- Practera API key
- OAuth client credentials (for OAuth authentication)

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```

## Local Development

1. Start the server in development mode:
   ```
   npm run dev
   ```
2. The server will be available at `http://localhost:3000/sse`
3. OAuth endpoints will be accessible at `http://localhost:3000/oauth/*`

## Build

To build the project for deployment:

```
npm run build
```

## Deployment to AWS Lambda

1. Make sure you have [AWS CLI](https://aws.amazon.com/cli/) installed and configured.
2. Set up your OAuth configuration parameters:
   ```
   export PRACTERA_CLIENT_ID=your_client_id
   export REDIRECT_URI=your_redirect_uri
   export ISSUER_URL=your_issuer_url
   export BASE_URL=your_base_url
   ```
3. Deploy using the Serverless Framework:
   ```
   npm run deploy -- --param="practeraClientId=$PRACTERA_CLIENT_ID" --param="redirectUri=$REDIRECT_URI" --param="issuerUrl=$ISSUER_URL" --param="baseUrl=$BASE_URL"
   ```

## Authentication Methods

### API Key Authentication

For simple integration, you can use API key authentication by providing:
- `apikey` parameter in each tool call
- `region` parameter to specify the Practera region

### OAuth 2.1 Authentication (coming soon)

The server also supports OAuth 2.1 for secure authentication flows:

1. Redirect users to `/oauth/authorize` for authorization
2. Exchange authorization code for access token at `/oauth/token`
3. Access the MCP server endpoints using the bearer token
4. Revoke tokens if needed at `/oauth/revoke`

## Available MCP Tools

This server exposes the following MCP tools:

- `mcp_practera_get_project` - Get details about a Practera project
- `mcp_practera_get_assessment` - Get details about a Practera assessment

## MCP Client Configuration

When connecting to this MCP server from an MCP client, you'll need to provide:

1. API key for Practera authentication (if using API key auth)
2. Region for the Practera API (usa, aus, euk or p2-stage)
3. OAuth configuration (if using OAuth authentication)

### Claude Desktop Configuration Example

```json
{
  "practera": {
    "url": "https://your-lambda-url.lambda-url.us-east-1.on.aws/mcp"
  }
}
```

## Example Usage (with Claude)

You can ask Claude to interact with Practera data using the MCP tools:

```
Please use the MCP tools to get information about project 123 from Practera.
```

Claude would then use the `mcp_practera_get_project` tool, providing the API key and region from the configuration.

## License

MIT License
