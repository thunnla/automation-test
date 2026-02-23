/**
 * Universal Test Engine — Custom Playwright Fixtures
 *
 * Extends the base Playwright `test` object with:
 *   - envConfig   : resolved EnvironmentConfig
 *   - authHeaders : pre-resolved auth headers
 *   - apiContext   : an APIRequestContext with auth baked in
 */

import { test as base, APIRequestContext } from '@playwright/test';
import { EnvironmentConfig, getConfig } from '../../config/env.config';
import { resolveAuth } from '../utils/auth-helper';

// ---------------------------------------------------------------------------
// Fixture types
// ---------------------------------------------------------------------------

export interface EngineFixtures {
  envConfig: EnvironmentConfig;
  authHeaders: Record<string, string>;
  apiContext: APIRequestContext;
}

// ---------------------------------------------------------------------------
// Extended test object
// ---------------------------------------------------------------------------

export const test = base.extend<EngineFixtures>({
  /** Provides the fully-resolved environment config to every test. */
  envConfig: async ({}, use) => {
    await use(getConfig());
  },

  /** Pre-resolves auth headers once per test worker. */
  authHeaders: async ({ playwright, envConfig }, use) => {
    if (envConfig.auth.strategy === 'none') {
      await use({});
      return;
    }
    const ctx = await playwright.request.newContext();
    try {
      const result = await resolveAuth(ctx, envConfig.apiBaseUrl, envConfig.auth);
      await use(result.headers);
    } finally {
      await ctx.dispose();
    }
  },

  /** A ready-to-use API request context with auth + default headers. */
  apiContext: async ({ playwright, envConfig, authHeaders }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: envConfig.apiBaseUrl,
      extraHTTPHeaders: {
        ...envConfig.headers,
        ...authHeaders,
      },
    });
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect } from '@playwright/test';
