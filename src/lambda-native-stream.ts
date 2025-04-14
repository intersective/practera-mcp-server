import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
// Note: streamifyResponse is available globally in the Lambda Node.js runtime
// This is a typing-only import and not actually importing the function
import { Context, Handler } from 'aws-lambda';
import { SessionStore } from './session-store.js';

// Define streamifyResponse manually since it's not in the types
declare const awslambda: {
  streamifyResponse: <T>(handler: (event: any, responseStream: StreamingResponseObject, context: Context) => Promise<T>) => Handler
};

// Define the StreamingResponseObject interface based on AWS docs
interface StreamingResponseObject {
  setContentType: (contentType: string) => void;
  write: (chunk: string) => void;
  end: () => void;
}

/**
 * Custom SSE transport implementation that works with Lambda streaming
 */
export class LambdaNativeSSETransport {
  private responseStream: StreamingResponseObject;
  private lambdaInitialized: boolean = false;
  readonly sessionId: string;
  private endpoint: string;
  onmessage?: (message: any) => void;
  onclose?: () => void;
  onerror?: (error: any) => void;

  constructor(endpoint: string, responseStream: StreamingResponseObject, requestInfo?: any) {
    this.responseStream = responseStream;
    this.endpoint = endpoint;
    this.sessionId = uuidv4();
    
    // Store session data in DynamoDB when constructed
    if (requestInfo) {
      SessionStore.saveSession(this.sessionId, {
        activeConnection: true,
        clientInfo: {
          userAgent: requestInfo.headers?.['user-agent'],
          ipAddress: requestInfo.requestContext?.http?.sourceIp,
        }
      }).catch(err => console.error('Failed to save initial session data:', err));
    }
  }

  /**
   * Initialize the Lambda SSE connection with proper headers
   */
  async start(): Promise<void> {
    if (this.lambdaInitialized) {
      return;
    }

    // Set SSE content type
    this.responseStream.setContentType('text/event-stream');
    
    // Critical SSE-specific headers (sent in the data stream since Lambda function URL doesn't expose headers)
    // These help the client know how to handle the connection
    this.responseStream.write(`:ok\n\n`); // Initial comment to establish connection
    
    // Send the endpoint event (mimicking the original SSEServerTransport behavior)
    this.responseStream.write(`event: endpoint\ndata: ${encodeURI(this.endpoint)}?sessionId=${this.sessionId}\n\n`);
    
    this.lambdaInitialized = true;
    console.log(`Lambda SSE transport started with session ID: ${this.sessionId}`);
    
    // Update session state in DynamoDB
    await SessionStore.saveSession(this.sessionId, {
      activeConnection: true,
    });
  }

  /**
   * Send a message through the Lambda responseStream
   */
  async send(message: any): Promise<void> {
    if (!this.lambdaInitialized) {
      await this.start();
    }

    // Ensure the message is properly formatted as JSON-RPC 2.0
    // Format exactly like the original SSEServerTransport
    // Do not modify the original message object if it's already in JSON-RPC format
    const jsonRpcMessage = typeof message === 'object' && message.jsonrpc === '2.0' 
      ? message
      : {
          jsonrpc: '2.0',
          method: 'notification',
          id: this.generateId(),
          params: message
        };

    this.responseStream.write(`event: message\ndata: ${JSON.stringify(jsonRpcMessage)}\n\n`);
    console.log(`Sent message through Lambda stream: ${JSON.stringify(jsonRpcMessage).substring(0, 100)}${JSON.stringify(jsonRpcMessage).length > 100 ? '...' : ''}`);
  }
  
  /**
   * Generate a random ID for JSON-RPC messages
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Handle a message from the client
   */
  async handleMessage(message: any): Promise<void> {
    try {
      if (!message) {
        console.error('Received empty message');
        this.sendError(400, 'Empty message received');
        return;
      }

      console.log('Handling incoming message:', JSON.stringify(message).substring(0, 200));
      
      // Validate the JSON-RPC message format
      if (!message.jsonrpc || message.jsonrpc !== '2.0' || !message.method) {
        console.error('Invalid JSON-RPC message format:', JSON.stringify(message).substring(0, 200));
        this.sendError(400, 'Invalid JSON-RPC message format', {
          code: -32600,
          message: 'Invalid Request',
          data: { details: 'Message must include jsonrpc: "2.0" and method fields' }
        });
        return;
      }

      // Process the message
      if (this.onmessage) {
        await this.onmessage(message);
      } else {
        console.error('No message handler registered');
        this.sendError(500, 'No message handler registered');
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(500, `Error processing message: ${error}`);
    }
  }

  /**
   * Sends an error response back to the client
   * @param statusCode HTTP status code
   * @param message Error message
   * @param jsonrpcError Optional JSON-RPC error object
   */
  private sendError(statusCode: number, message: string, jsonrpcError?: any): void {
    try {
      const errorResponse = jsonrpcError ? {
        jsonrpc: '2.0',
        error: jsonrpcError,
        id: null
      } : { error: message };
      
      this.send(errorResponse);
    } catch (error) {
      console.error('Failed to send error response:', error);
    }
  }
  
  /**
   * Handle POST message for bidirectional communication
   */
  async handlePostMessage(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body || '{}';
      const message = typeof body === 'string' ? JSON.parse(body) : body;
      
      await this.handleMessage(message);
      res.status(202).send('Accepted');
    } catch (error) {
      console.error('Error handling post message:', error);
      res.status(400).send('Invalid message');
      
      if (this.onerror) {
        this.onerror(error);
      }
    }
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    if (this.lambdaInitialized) {
      this.responseStream.end();
      this.lambdaInitialized = false;
      
      // Update session state in DynamoDB
      await SessionStore.closeSession(this.sessionId);
    }
    
    if (this.onclose) {
      this.onclose();
    }
  }
}

/**
 * Wrapper function for Lambda response streaming using the streamifyResponse decorator
 */
export function createLambdaStreamHandler(app: any) {
  // Only use streamifyResponse in Lambda environment
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log('Not running in Lambda environment, returning original app');
    return app;
  }

  // Check if awslambda is available
  if (typeof awslambda === 'undefined' || typeof awslambda.streamifyResponse !== 'function') {
    console.error('awslambda.streamifyResponse is not available!');
    return app;
  }

  console.log('Creating Lambda native streaming handler with MCP support');
  
  // Store transports for bidirectional communication
  const transports = new Map<string, LambdaNativeSSETransport>();
  
  return awslambda.streamifyResponse(async (event: any, responseStream: StreamingResponseObject, context: Context) => {
    console.log('Lambda native streaming handler invoked');
    console.log('Event path:', event.rawPath);
    
    // For SSE connections (GET /sse or GET /)
    if ((event.rawPath === '/sse' || event.rawPath === '/') && 
        event.requestContext?.http?.method === 'GET') {
      
      console.log('Handling SSE connection request');
      
      try {
        // Create an object to manage this specific connection's state
        const connectionState = {
          messageQueue: [],
          isActive: true
        };
        
        // Create our custom Lambda-compatible SSE transport
        const transport = new LambdaNativeSSETransport('/messages', responseStream, event);
        
        // Store the transport for message handling
        transports.set(transport.sessionId, transport);
        
        // Store session info in DynamoDB to handle messages from other endpoints
        await SessionStore.saveSession(transport.sessionId, {
          activeConnection: true,
          clientInfo: {
            userAgent: event.headers?.['user-agent'],
            ipAddress: event.requestContext?.http?.sourceIp,
          }
        });
        
        // Get access to the McpServer instance
        const getMcpServer = () => {
          return (global as any).mcpServerInstance;
        };
        
        // Start the transport and establish the connection
        await transport.start();
        
        // Attempt to connect the transport to the MCP server
        const server = getMcpServer();
        if (server) {
          console.log('Connecting transport to MCP server');
          
          // Connect the transport to the MCP server
          try {
            // Create a proper transport object that MCP expects
            await server.connect(transport);
            
            // Keep the connection open until Lambda times out or client disconnects
            await new Promise<void>((resolve) => {
              // Set up a timer to keep the connection alive
              const keepAliveInterval = setInterval(() => {
                try {
                  // Don't use JSON-RPC for keepalives, just send a simple comment that the EventSource client can safely ignore
                  responseStream.write(":keepalive\n\n");
                } catch (err) {
                  console.error('Keepalive error:', err);
                  clearInterval(keepAliveInterval);
                  resolve();
                }
              }, 15000); // 15 seconds keep-alive interval
              
              // Set up a timeout to eventually close the connection (prevent Lambda from running forever)
              const timeout = setTimeout(() => {
                clearInterval(keepAliveInterval);
                resolve();
              }, context.getRemainingTimeInMillis() - 5000); // 5 seconds before Lambda times out
              
              // Set up cleanup handler
              transport.onclose = () => {
                clearInterval(keepAliveInterval);
                clearTimeout(timeout);
                SessionStore.closeSession(transport.sessionId).catch(err => 
                  console.error('Error closing session:', err));
                resolve();
              };
            });
          } catch (error) {
            console.error('Error connecting to MCP server:', error);
            responseStream.write(`data: ${JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: "Failed to connect to MCP server",
                data: { error: String(error) }
              }
            })}\n\n`);
            
            // Close the session in DynamoDB
            await SessionStore.closeSession(transport.sessionId);
            responseStream.end();
          }
        } else {
          console.error('MCP server instance not found!');
          responseStream.write(`data: ${JSON.stringify({error: 'MCP server instance not found'})}\n\n`);
          
          // Close the session in DynamoDB
          await SessionStore.closeSession(transport.sessionId);
          responseStream.end();
        }
      } catch (error) {
        console.error('Error handling SSE connection:', error);
        responseStream.write(`data: ${JSON.stringify({error: 'SSE connection error'})}\n\n`);
        responseStream.end();
      }
    } 
    // For message handling (POST /messages)
    else if (event.rawPath === '/messages' && 
             event.requestContext?.http?.method === 'POST') {
      
      console.log('Handling message POST request');
      console.log('Event query parameters:', event.queryStringParameters);
      
      try {
        // Get the session ID from the query parameters
        const sessionId = event.queryStringParameters?.sessionId;
        if (!sessionId) {
          console.error('POST /messages called without sessionId');
          
          // Set content type for the response stream
          responseStream.setContentType('application/json');
          
          // Write error directly to response stream
          responseStream.write(JSON.stringify({ 
            error: 'Missing sessionId parameter', 
            code: 'MISSING_SESSION_ID' 
          }));
          
          responseStream.end();
          return;
        }
        
        // First check if there's a transport in-memory (same Lambda instance)
        let transport = transports.get(sessionId);
        
        // If not found in-memory, check DynamoDB for session state
        if (!transport) {
          console.log(`Transport not found in memory for session ${sessionId}, checking DynamoDB...`);
          
          try {
            const sessionData = await SessionStore.getSession(sessionId);
            
            if (sessionData && sessionData.activeConnection) {
              console.log(`Session ${sessionId} found in DynamoDB, but connection is in another Lambda instance`);
              
              // Accept the message but indicate that the client should reconnect
              responseStream.setContentType('application/json');
              responseStream.write(JSON.stringify({ 
                success: true,
                shouldReconnect: true,
                message: 'Message received, but a new connection should be established for future messages'
              }));
              
              responseStream.end();
              return;
            } else {
              console.error(`No active session found for sessionId: ${sessionId}`);
              
              // Set content type for the response stream
              responseStream.setContentType('application/json');
              
              // Write error directly to response stream
              responseStream.write(JSON.stringify({ 
                error: 'No transport found for sessionId', 
                code: 'INVALID_SESSION_ID',
                sessionId 
              }));
              
              responseStream.end();
              return;
            }
          } catch (dbError) {
            console.error('Error checking DynamoDB for session:', dbError);
            
            // Set content type for the response stream
            responseStream.setContentType('application/json');
            
            // Write error directly to response stream
            responseStream.write(JSON.stringify({ 
              error: 'Database error', 
              code: 'DB_ERROR',
              message: 'Error checking session state'
            }));
            
            responseStream.end();
            return;
          }
        }
        
        // Transport exists in memory, proceed with handling the message
        console.log(`Found transport for session ${sessionId}, handling message...`);
        
        // Parse the message body
        const body = event.body || '{}';
        const isBase64Encoded = event.isBase64Encoded || false;
        const decodedBody = isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
        
        try {
          const message = JSON.parse(decodedBody);
          console.log('Received message:', JSON.stringify(message).substring(0, 200));
          
          // Handle the message
          await transport.handleMessage(message);
          
          // Update session activity timestamp
          await SessionStore.saveSession(sessionId, { activeConnection: true });
          
          // Set content type for the response stream
          responseStream.setContentType('application/json');
          
          // Write success directly to response stream
          responseStream.write(JSON.stringify({ success: true }));
          
          responseStream.end();
          return;
        } catch (parseError) {
          console.error('Error parsing message body:', parseError);
          console.log('Raw message body:', decodedBody);
          
          // Set content type for the response stream
          responseStream.setContentType('application/json');
          
          // Write error directly to response stream
          responseStream.write(JSON.stringify({ 
            error: 'Invalid message format', 
            code: 'INVALID_MESSAGE_FORMAT',
            details: String(parseError)
          }));
          
          responseStream.end();
          return;
        }
      } catch (error) {
        console.error('Error handling message:', error);
        
        // Set content type for the response stream
        responseStream.setContentType('application/json');
        
        // Write error directly to response stream
        responseStream.write(JSON.stringify({ 
          error: 'Failed to process message', 
          code: 'SERVER_ERROR',
          details: String(error)
        }));
        
        responseStream.end();
        return;
      }
    }
    // Handle OPTIONS requests for CORS preflight
    else if (event.requestContext?.http?.method === 'OPTIONS') {
      console.log('Handling OPTIONS request for CORS');
      
      // Set content type
      responseStream.setContentType('text/plain');
      
      // Set CORS headers by writing to the response stream
      responseStream.write('');  // Empty response body
      responseStream.end();
      return;
    }
    // For all other requests, pass through to Express
    else {
      console.log('Passing request to Express app');
      return await app(event, context);
    }
  });
} 