/**
 * Universal Test Engine — Authentication Helper
 *
 * Provides pluggable auth strategies so tests can obtain tokens or
 * headers before executing requests.
 */

import { APIRequestContext } from '@playwright/test';
import { AuthConfig } from '../../config/env.config';
import { deepGet } from './helpers';

export interface AuthResult {
  headers: Record<string, string>;
  token?: string;
}

/**
 * Resolve authentication and return the headers to attach to requests.
 */
export async function resolveAuth(
  request: APIRequestContext,
  baseUrl: string,
  auth: AuthConfig,
): Promise<AuthResult> {
  switch (auth.strategy) {
    case 'bearer': {
      if (!auth.tokenEndpoint || !auth.credentials) {
        throw new Error('Bearer strategy requires tokenEndpoint and credentials');
      }
      const url = `${baseUrl.replace(/\/+$/, '')}/${auth.tokenEndpoint.replace(/^\/+/, '')}`;
      const res = await request.post(url, { data: auth.credentials });
      if (!res.ok()) {
        throw new Error(`Auth request failed: ${res.status()} ${res.statusText()}`);
      }
      const body = await res.json();
      // Look for token in common locations
      const token =
        (deepGet(body, 'token') as string) ??
        (deepGet(body, 'data.token') as string) ??
        (deepGet(body, 'access_token') as string) ??
        (deepGet(body, 'data.access_token') as string);

      if (!token) {
        throw new Error('Could not extract token from auth response');
      }
      return {
        headers: { Authorization: `Bearer ${token}` },
        token,
      };
    }

    case 'basic': {
      if (!auth.credentials?.username || !auth.credentials?.password) {
        throw new Error('Basic strategy requires username and password in credentials');
      }
      const encoded = Buffer.from(
        `${auth.credentials.username}:${auth.credentials.password}`,
      ).toString('base64');
      return { headers: { Authorization: `Basic ${encoded}` } };
    }

    case 'api-key': {
      const headerName = auth.headerName ?? 'X-API-Key';
      const key = auth.apiKey ?? auth.credentials?.apiKey;
      if (!key) throw new Error('api-key strategy requires apiKey or credentials.apiKey');
      return { headers: { [headerName]: key } };
    }

    case 'none':
    default:
      return { headers: {} };
  }
}
