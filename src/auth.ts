import { decodeJwt } from 'jose';
import type { Request, Response, NextFunction } from 'express';

interface AuthConfig {
  apikey?: string;
  accessToken?: string;
  appkey?: string;
}

interface AuthOptions {
  allowApikey?: boolean;
  allowOAuth?: boolean;
}

/**
 * Authentication helper for Practera API
 * Handles both API key and OAuth authentication
 */
export class PracteraAuth {
  private apikey?: string;
  private accessToken?: string;
  private appkey: string;
  public timelineId?: string;
  public role?: string;

  /**
   * Create a new authentication helper
   * @param {Object} config Configuration options
   * @param {string} [config.apikey] API key for direct auth
   * @param {string} [config.accessToken] OAuth access token
   * @param {string} [config.appKey] App key (if needed)
   */
  constructor(config: AuthConfig = {}) {
    this.apikey = config.apikey;
    this.accessToken = config.accessToken;
    this.appkey = config.appkey || '';
    
    if (typeof config.apikey === 'string') {
      const decoded = decodeJwt(config.apikey);
      this.timelineId = decoded.timeline_id as string || undefined;
      this.role = decoded.role as string || 'none';
    }
    // Verify we have at least one auth method
    if (!this.apikey && !this.accessToken) {
      throw new Error('Either apikey or accessToken is required for authentication');
    }
  }

  /**
   * Get headers for GraphQL requests
   * @returns {Object} Headers object
   */
  getHeaders(): Record<string, string> {
    // Prefer OAuth token if available
    if (this.accessToken) {
      return {
        'Authorization': `Bearer ${this.accessToken}`,
        'appkey': this.appkey
      };
    }

    if (!this.apikey) {
      throw new Error('No API key provided');
    }

    // Fall back to API key
    return {
      'apikey': this.apikey || '',
      'appkey': this.appkey,
      'timelineId': this.timelineId || ''
    };
  }

  /**
   * Verify an OAuth token and extract claims
   * @param {string} token OAuth access token
   * @returns {Promise<Object>} Token claims
   */
  static async verifyToken(token: string): Promise<Record<string, any>> {
    try {
      // This is a placeholder - in a real implementation, you would verify
      // the token with the issuer or use a library specific to your OAuth provider
      
      // For JWT tokens, you might do something like:
      const decoded = decodeJwt(token);
      
      // Check token expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }
      return decoded as Record<string, any>;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify an API key and extract claims
   * @param {string} apikey API key
   * @returns {Promise<Object>} Token claims
   */
  static async verifyApikey(apikey: string, role?: string): Promise<Record<string, any>> {
    try {
      // This is a placeholder - in a real implementation, you would verify
      // the token with the issuer or use a library specific to your OAuth provider
      
      // For JWT tokens, you might do something like:
      const decoded = decodeJwt(apikey);
      
      // Check token expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }
      if (role && decoded.role !== role) {
        throw new Error('Unauthorized');
      }
      return decoded as Record<string, any>;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }  
  /**
   * Create an auth object from request headers
   * @param {Object} headers Request headers
   * @returns {PracteraAuth} Authentication helper
   */
  static fromHeaders(headers: Record<string, string>): PracteraAuth {
    // Extract Bearer token if present
    const authHeader = headers.authorization || headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return new PracteraAuth({ accessToken: token });
    }
    
    // Extract API key if present
    const apikey = headers.apikey || headers.apikey || headers['x-api-key'];
    if (apikey) {
      return new PracteraAuth({ apikey });
    }
    
    throw new Error('No authentication credentials found in headers');
  }
}

/**
 * Express middleware to require authentication
 * @param {Object} options Middleware options
 * @param {boolean} [options.allowApikey=true] Allow API key authentication
 * @param {boolean} [options.allowOAuth=true] Allow OAuth authentication
 * @returns {Function} Express middleware
 */
export function requireAuth(options: AuthOptions = { allowApikey: true, allowOAuth: true }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for OAuth token
      const authHeader = req.headers.authorization || req.headers.Authorization as string | undefined;
      if (options.allowOAuth && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Verify token
        const claims = await PracteraAuth.verifyToken(token);
        
        // Attach claims to request
        (req as any).user = claims;
        return next();
      }
      
      // Check for API key
      const apikey = req.headers.apikey || req.headers.apikey || req.headers['x-api-key'] as string | undefined;
      if (options.allowApikey && apikey) {
        // API key auth is simpler - just verify it exists
        // In a real implementation, you might validate it against a database
        // Verify token
        const user = await PracteraAuth.verifyApikey(apikey as string, 'admin');
        (req as any).apikey = apikey;
        (req as any).user = user;
        return next();
      }
      
      // No valid authentication
      res.status(401).json({ error: 'Unauthorized: Valid authentication required' });
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ error: `Unauthorized: ${error instanceof Error ? error.message : String(error)}` });
    }
  };
} 