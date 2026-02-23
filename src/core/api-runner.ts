/**
 * Universal Test Engine — API Test Runner
 *
 * Given a loaded API test suite (from JSON), this module dynamically
 * creates Playwright test cases with full assertion support.
 */

import { APIRequestContext, expect, TestInfo } from '@playwright/test';
import { test } from './fixtures';
import { deepGet, deepContains, deepEqual, buildUrl } from '../utils/helpers';
import { validateAgainstSchema } from '../utils/schema-validator';
import { interpolate, loadTestFile, filterByTags, TestSuiteFile } from '../utils/data-loader';
import { attachJson } from '../utils/report-helper';

// ---------------------------------------------------------------------------
// Types (mirrors the JSON schema)
// ---------------------------------------------------------------------------

interface ApiExpectation {
  status?: number;
  statusRange?: { min: number; max: number };
  bodyContains?: Record<string, unknown>;
  bodyExact?: unknown;
  bodySchema?: object;
  bodyPath?: {
    path: string;
    equals?: unknown;
    contains?: unknown;
    type?: string;
    minLength?: number;
    maxLength?: number;
    regex?: string;
  }[];
  headers?: Record<string, string>;
  responseTime?: number;
}

interface ApiTestCase {
  [key: string]: unknown;
  name: string;
  tags?: string[];
  method: string;
  endpoint: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  auth?: string;
  expect: ApiExpectation;
  skip?: boolean;
  only?: boolean;
  timeout?: number;
  retries?: number;
  dataInjection?: Record<string, string>;
}

interface ApiSetup {
  method: string;
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  extractToken?: { fromPath: string; as: string };
}

interface ApiTestSuite extends TestSuiteFile {
  baseEndpoint?: string;
  setup?: ApiSetup;
  teardown?: ApiSetup;
  tests: ApiTestCase[];
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Register a full API test suite from a JSON data file.
 *
 * @param jsonPath  Path relative to `data/` — e.g. `api/users.json`
 * @param tagFilter Optional array of tags to include. Empty = all.
 */
export function runApiSuite(jsonPath: string, tagFilter: string[] = []): void {
  const suite = loadTestFile<ApiTestSuite>(jsonPath, 'api');
  const tests_ = filterByTags(suite.tests, tagFilter);

  // Shared mutable store for interpolation variables (e.g. tokens).
  const vars: Record<string, string> = {};

  test.describe(`[API] ${suite.suite}`, () => {
    // ---- Suite-level setup (e.g. login) ----
    if (suite.setup) {
      test.beforeAll(async ({ apiContext }) => {
        const setup = interpolate(suite.setup!, vars);
        const url = buildUrl('', setup.endpoint, undefined);
        const res = await apiContext.fetch(url, {
          method: setup.method,
          data: setup.body,
          headers: setup.headers,
        });
        if (setup.extractToken) {
          const body = await res.json();
          const val = deepGet(body, setup.extractToken.fromPath);
          if (typeof val === 'string') {
            vars[setup.extractToken.as] = val;
          }
        }
      });
    }

    // ---- Suite-level teardown ----
    if (suite.teardown) {
      test.afterAll(async ({ apiContext }) => {
        const td = interpolate(suite.teardown!, vars);
        await apiContext.fetch(buildUrl('', td.endpoint, undefined), {
          method: td.method,
          data: td.body,
          headers: td.headers,
        });
      });
    }

    // ---- Individual test cases ----
    for (const tc of tests_) {
      const tagStr = tc.tags?.map((t) => `@${t}`).join(' ') ?? '';
      const title = `${tc.name} ${tagStr}`.trim();

      const fn = tc.skip ? test.skip : tc.only ? test.only : test;

      fn(title, async ({ apiContext, envConfig }, testInfo: TestInfo) => {
        if (tc.timeout) test.setTimeout(tc.timeout as number);

        // Merge data injection into variable store
        const localVars = { ...vars, ...(tc.dataInjection ?? {}) };

        // Interpolate the test case
        const resolved = interpolate(tc, localVars) as ApiTestCase;
        const baseEndpoint = suite.baseEndpoint ?? '';
        const fullEndpoint = `${baseEndpoint}${resolved.endpoint}`;

        // Build request
        const url = buildUrl('', fullEndpoint, resolved.query as Record<string, string> | undefined);
        const headers: Record<string, string> = { ...(resolved.headers ?? {}) };
        if (resolved.auth) {
          headers['Authorization'] = `Bearer ${resolved.auth}`;
        }

        // Execute request & measure time
        const start = Date.now();
        const response = await apiContext.fetch(url, {
          method: resolved.method as string,
          data: resolved.body,
          headers,
        });
        const elapsed = Date.now() - start;

        // Parse response
        let responseBody: unknown = null;
        const contentType = response.headers()['content-type'] ?? '';
        if (contentType.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }

        // Attach request & response to report
        await attachJson(testInfo, 'Request', {
          method: resolved.method,
          url,
          headers,
          body: resolved.body,
        });
        await attachJson(testInfo, 'Response', {
          status: response.status(),
          headers: response.headers(),
          body: responseBody,
          elapsed,
        });

        // ---- Assertions ----
        const exp = resolved.expect as ApiExpectation;

        // Status code
        if (exp.status !== undefined) {
          expect(response.status(), `Expected status ${exp.status}`).toBe(exp.status);
        }

        // Status range
        if (exp.statusRange) {
          expect(response.status()).toBeGreaterThanOrEqual(exp.statusRange.min);
          expect(response.status()).toBeLessThanOrEqual(exp.statusRange.max);
        }

        // Body contains (partial match)
        if (exp.bodyContains) {
          expect(
            deepContains(responseBody, exp.bodyContains),
            `Response body should contain ${JSON.stringify(exp.bodyContains)}`,
          ).toBe(true);
        }

        // Body exact match
        if (exp.bodyExact !== undefined) {
          expect(
            deepEqual(responseBody, exp.bodyExact),
            'Response body should exactly match expected',
          ).toBe(true);
        }

        // Body JSON schema validation
        if (exp.bodySchema) {
          const result = validateAgainstSchema(responseBody, exp.bodySchema);
          expect(result.valid, `Schema validation failed:\n${result.errors.join('\n')}`).toBe(true);
        }

        // Body path assertions
        if (exp.bodyPath) {
          for (const bp of exp.bodyPath) {
            const actual = deepGet(responseBody, bp.path);

            if (bp.equals !== undefined) {
              expect(actual, `${bp.path} should equal ${JSON.stringify(bp.equals)}`).toEqual(bp.equals);
            }
            if (bp.contains !== undefined) {
              expect(
                deepContains(actual, bp.contains),
                `${bp.path} should contain ${JSON.stringify(bp.contains)}`,
              ).toBe(true);
            }
            if (bp.type) {
              expect(typeof actual, `${bp.path} should be type ${bp.type}`).toBe(bp.type);
            }
            if (bp.minLength !== undefined) {
              expect(
                (actual as string | unknown[]).length,
                `${bp.path} length should be >= ${bp.minLength}`,
              ).toBeGreaterThanOrEqual(bp.minLength);
            }
            if (bp.maxLength !== undefined) {
              expect(
                (actual as string | unknown[]).length,
                `${bp.path} length should be <= ${bp.maxLength}`,
              ).toBeLessThanOrEqual(bp.maxLength);
            }
            if (bp.regex) {
              expect(String(actual)).toMatch(new RegExp(bp.regex));
            }
          }
        }

        // Response headers
        if (exp.headers) {
          const respHeaders = response.headers();
          for (const [key, expected] of Object.entries(exp.headers)) {
            expect(respHeaders[key.toLowerCase()]).toBe(expected);
          }
        }

        // Response time
        if (exp.responseTime) {
          expect(elapsed, `Response took ${elapsed}ms (max ${exp.responseTime}ms)`).toBeLessThanOrEqual(
            exp.responseTime,
          );
        }
      });
    }
  });
}
