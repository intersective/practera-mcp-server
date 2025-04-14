import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Initialize the DynamoDB client
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

// Table name from environment variable
const tableName = process.env.SESSION_TABLE;

// One hour TTL
const DEFAULT_TTL = 60 * 60;

export interface SessionData {
  sessionId: string;
  activeConnection?: boolean;
  lastActivityAt: number;
  reconnectNeeded?: boolean;
  clientInfo?: {
    userAgent?: string;
    ipAddress?: string;
  };
  // Other metadata as needed
}

export class SessionStore {
  /**
   * Create or update a session
   */
  static async saveSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    if (!tableName) {
      console.warn('SESSION_TABLE environment variable not set, skipping DynamoDB operation');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    
    try {
      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: {
          sessionId,
          ...data,
          lastActivityAt: now,
          ttl: now + DEFAULT_TTL, // TTL in seconds
        },
      }));
      
      console.log(`Session ${sessionId} saved to DynamoDB`);
    } catch (error) {
      console.error('Error saving session to DynamoDB:', error);
    }
  }
  
  /**
   * Get a session by ID
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    if (!tableName) {
      console.warn('SESSION_TABLE environment variable not set, skipping DynamoDB operation');
      return null;
    }
    
    try {
      const response = await docClient.send(new GetCommand({
        TableName: tableName,
        Key: { sessionId },
      }));
      
      return response.Item as SessionData || null;
    } catch (error) {
      console.error('Error retrieving session from DynamoDB:', error);
      return null;
    }
  }
  
  /**
   * Close a session by setting its active flag to false
   */
  static async closeSession(sessionId: string): Promise<void> {
    if (!tableName) {
      console.warn('SESSION_TABLE environment variable not set, skipping DynamoDB operation');
      return;
    }
    
    try {
      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: {
          sessionId,
          activeConnection: false,
          lastActivityAt: Math.floor(Date.now() / 1000),
        },
      }));
      
      console.log(`Session ${sessionId} marked as closed in DynamoDB`);
    } catch (error) {
      console.error('Error closing session in DynamoDB:', error);
    }
  }
  
  /**
   * Delete a session completely
   */
  static async deleteSession(sessionId: string): Promise<void> {
    if (!tableName) {
      console.warn('SESSION_TABLE environment variable not set, skipping DynamoDB operation');
      return;
    }
    
    try {
      await docClient.send(new DeleteCommand({
        TableName: tableName,
        Key: { sessionId },
      }));
      
      console.log(`Session ${sessionId} deleted from DynamoDB`);
    } catch (error) {
      console.error('Error deleting session from DynamoDB:', error);
    }
  }
} 