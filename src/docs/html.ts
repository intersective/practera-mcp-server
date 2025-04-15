export const homepageHtml = `
<html>
  <head>
    <title>Practera MCP Server</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      h1 { color: #3F51B5; }
      a { color: #3F51B5; }
    </style>
  </head>
  <body>
    <h1>Practera MCP Server</h1>
    <p>This server provides Model Context Protocol integration with Practera.</p>
    <p>It enables LLMs to access project data and assessment information from Practera.</p>
    <p><a href="/docs">View documentation</a></p>
  </body>
</html>
`;

export const docsHtml = `
<html>
  <head>
    <title>Practera MCP Server Documentation</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      h1, h2, h3 { color: #3F51B5; }
      pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
      code { font-family: monospace; }
    </style>
  </head>
  <body>
    <h1>Practera MCP Server Documentation</h1>
    
    <h2>Overview</h2>
    <p>
      The Practera MCP Server implements the Model Context Protocol (MCP) to allow large language models (LLMs) 
      to interact with Practera's experiential learning platform. It provides tools for retrieving project data 
      and assessment information.
    </p>
    
    <h2>Endpoints</h2>
    <ul>
      <li><code>/sse</code> - Server-Sent Events endpoint for establishing MCP connections</li>
      <li><code>/messages</code> - Endpoint for sending messages to established SSE connections</li>
      <li><code>/health</code> - Health check endpoint</li>
      <li><code>/docs</code> - This documentation</li>
    </ul>
    
    <h2>Available Tools</h2>
    
    <h3>mcp_practera_get_project</h3>
    <p>Retrieves information about a Practera project, including milestones, activities, and tasks.</p>
    <pre><code>
{
  "tool": "mcp_practera_get_project",
  "parameters": {
    "apikey": "your-api-key", // Optional
    "region": "usa"           // Optional, defaults to "usa"
  }
}
    </code></pre>
    
    <h3>mcp_practera_get_assessment</h3>
    <p>Retrieves detailed information about a specific assessment, including questions and choices.</p>
    <pre><code>
{
  "tool": "mcp_practera_get_assessment",
  "parameters": {
    "apikey": "your-api-key",   // Optional
    "region": "usa",            // Optional, defaults to "usa"
    "assessmentId": "12345"     // Required
  }
}
    </code></pre>

    <h3>mcp_practera_search_project_briefs</h3>
    <p>Searches for project briefs that match a specific skill. This tool doesn't require authentication.</p>
    <pre><code>
{
  "tool": "mcp_practera_search_project_briefs",
  "parameters": {
    "skill": "data analysis",  // Required
    "limit": 5                 // Optional, defaults to 5
  }
}
    </code></pre>
    
    <h2>Authentication</h2>
    <p>
      Authentication can be done using an API key or OAuth. When using API keys, pass the key in the tool 
      parameters. OAuth integration is under development.
    </p>
    
    <h2>Regions</h2>
    <p>Available regions:</p>
    <ul>
      <li><code>usa</code> - United States (default)</li>
      <li><code>aus</code> - Australia</li>
      <li><code>euk</code> - Europe/UK</li>
    </ul>
  </body>
</html>
`; 