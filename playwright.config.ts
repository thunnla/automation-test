/**
 * Universal Test Engine — Playwright Configuration
 *
 * Reads the active environment config and wires everything together:
 * retries, timeouts, reporters, video, trace, screenshots, projects.
 */

import { defineConfig, devices } from '@playwright/test';
import { getConfig, getEnvName } from './config/env.config';

const env = getConfig();
const envName = getEnvName();

export default defineConfig({
  /* ---------- Global setup / teardown ---------- */
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',

  /* ---------- Global settings ---------- */
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? env.retries : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: env.timeout,

  /* ---------- Reporters ---------- */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/results.xml' }],
  ],

  /* ---------- Shared expect settings ---------- */
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },

  /* ---------- Output directories ---------- */
  outputDir: 'test-results',
  snapshotDir: 'snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',

  /* ---------- Global metadata (available in tests) ---------- */
  metadata: {
    environment: envName,
    apiBaseUrl: env.apiBaseUrl,
    uiBaseUrl: env.uiBaseUrl,
  },

  /* ---------- Shared settings for all projects ---------- */
  use: {
    baseURL: env.uiBaseUrl,
    extraHTTPHeaders: env.headers,
    screenshot: env.features.screenshots ? 'only-on-failure' : 'off',
    video: env.features.video,
    trace: env.features.trace,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /* ---------- Projects (browser matrix) ---------- */
  projects: [
    // API tests — no browser needed
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.ts',
      use: {
        baseURL: env.apiBaseUrl,
      },
    },

    // UI tests — Chromium (desktop)
    {
      name: 'chromium',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // UI tests — Firefox
    {
      name: 'firefox',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },

    // UI tests — WebKit / Safari
    {
      name: 'webkit',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile — iPhone 14
    {
      name: 'mobile-safari',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['iPhone 14'] },
    },

    // Mobile — Pixel 7
    {
      name: 'mobile-chrome',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
