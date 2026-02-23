/**
 * Universal Test Engine — UI Test Runner
 *
 * Dynamically creates Playwright browser tests from JSON definitions.
 * Each test case can contain an ordered list of UI actions + assertions.
 */

import { Page, expect, TestInfo } from '@playwright/test';
import { test } from './fixtures';
import { interpolate, loadTestFile, filterByTags, TestSuiteFile } from '../utils/data-loader';
import { attachScreenshot, attachJson } from '../utils/report-helper';

// ---------------------------------------------------------------------------
// Types (mirrors ui-test.schema.json)
// ---------------------------------------------------------------------------

interface UiAction {
  action: string;
  selector?: string;
  value?: unknown;
  options?: Record<string, unknown>;
  description?: string;
}

interface SnapshotConfig {
  name: string;
  fullPage?: boolean;
  selector?: string;
}

interface UiTestCase {
  [key: string]: unknown;
  name: string;
  tags?: string[];
  url?: string;
  viewport?: { width: number; height: number };
  steps: UiAction[];
  snapshot?: SnapshotConfig;
  skip?: boolean;
  only?: boolean;
  timeout?: number;
  retries?: number;
  dataInjection?: Record<string, string>;
}

interface UiTestSuite extends TestSuiteFile {
  basePath?: string;
  setup?: UiAction;
  teardown?: UiAction;
  tests: UiTestCase[];
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

async function executeAction(page: Page, action: UiAction): Promise<void> {
  switch (action.action) {
    // Navigation
    case 'goto':
      await page.goto(String(action.value ?? action.selector ?? '/'), action.options as any);
      break;

    // Interactions
    case 'click':
      await page.locator(action.selector!).click(action.options as any);
      break;
    case 'fill':
      await page.locator(action.selector!).fill(String(action.value));
      break;
    case 'select':
      await page.locator(action.selector!).selectOption(String(action.value));
      break;
    case 'check':
      await page.locator(action.selector!).check();
      break;
    case 'uncheck':
      await page.locator(action.selector!).uncheck();
      break;
    case 'hover':
      await page.locator(action.selector!).hover();
      break;
    case 'press':
      await page.locator(action.selector!).press(String(action.value));
      break;
    case 'scroll':
      if (action.selector) {
        await page.locator(action.selector).scrollIntoViewIfNeeded();
      } else {
        await page.evaluate(
          ([x, y]: number[]) => { (globalThis as any).scrollTo(x, y); },
          (action.value as number[]) ?? [0, 500],
        );
      }
      break;
    case 'upload':
      await page.locator(action.selector!).setInputFiles(action.value as string | string[]);
      break;
    case 'evaluate':
      await page.evaluate(String(action.value));
      break;

    // Waits
    case 'wait':
      await page.waitForTimeout(Number(action.value ?? 1000));
      break;
    case 'waitForSelector':
      await page.waitForSelector(action.selector!, action.options as any);
      break;
    case 'waitForURL':
      await page.waitForURL(String(action.value), action.options as any);
      break;

    // Assertions
    case 'assertVisible':
      await expect(page.locator(action.selector!)).toBeVisible(action.options as any);
      break;
    case 'assertHidden':
      await expect(page.locator(action.selector!)).toBeHidden(action.options as any);
      break;
    case 'assertText':
      await expect(page.locator(action.selector!)).toContainText(String(action.value), action.options as any);
      break;
    case 'assertValue':
      await expect(page.locator(action.selector!)).toHaveValue(String(action.value), action.options as any);
      break;
    case 'assertURL':
      await expect(page).toHaveURL(String(action.value), action.options as any);
      break;
    case 'assertTitle':
      await expect(page).toHaveTitle(String(action.value), action.options as any);
      break;
    case 'assertCount':
      await expect(page.locator(action.selector!)).toHaveCount(
        Number(action.value),
        action.options as any,
      );
      break;
    case 'screenshot':
      // Inline screenshot (not the same as snapshot comparison)
      await page.screenshot({
        path: `test-results/screenshots/${action.value ?? 'inline'}.png`,
        fullPage: (action.options?.fullPage as boolean) ?? false,
      });
      break;

    default:
      throw new Error(`Unknown UI action: "${action.action}"`);
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Register a full UI test suite from a JSON data file.
 *
 * @param jsonPath  Path relative to `data/` — e.g. `ui/login.json`
 * @param tagFilter Optional array of tags to include. Empty = all.
 */
export function runUiSuite(jsonPath: string, tagFilter: string[] = []): void {
  const suite = loadTestFile<UiTestSuite>(jsonPath, 'ui');
  const tests_ = filterByTags(suite.tests, tagFilter);

  const vars: Record<string, string> = {};

  test.describe(`[UI] ${suite.suite}`, () => {
    for (const tc of tests_) {
      const tagStr = tc.tags?.map((t) => `@${t}`).join(' ') ?? '';
      const title = `${tc.name} ${tagStr}`.trim();

      const fn = tc.skip ? test.skip : tc.only ? test.only : test;

      fn(title, async ({ page, envConfig }, testInfo: TestInfo) => {
        if (tc.timeout) test.setTimeout(tc.timeout as number);

        const localVars = { ...vars, ...(tc.dataInjection ?? {}) };
        const resolved = interpolate(tc, localVars) as UiTestCase;

        // Viewport override
        if (resolved.viewport) {
          await page.setViewportSize(resolved.viewport);
        }

        // Navigate to URL if specified
        if (resolved.url) {
          const basePath = suite.basePath ?? '';
          await page.goto(`${basePath}${resolved.url}`);
        }

        // Execute each step sequentially
        for (let i = 0; i < resolved.steps.length; i++) {
          const step = resolved.steps[i];
          const desc = step.description ?? `Step ${i + 1}: ${step.action}`;

          await test.step(desc, async () => {
            await executeAction(page, step);
          });
        }

        // Snapshot comparison (visual regression)
        if (resolved.snapshot) {
          const snap = resolved.snapshot;
          if (snap.selector) {
            const locator = page.locator(snap.selector);
            await expect(locator).toHaveScreenshot(`${snap.name}.png`);
          } else {
            await expect(page).toHaveScreenshot(`${snap.name}.png`, {
              fullPage: snap.fullPage ?? true,
            });
          }
        }

        // Attach final screenshot on failure
        if (testInfo.status !== testInfo.expectedStatus) {
          const screenshot = await page.screenshot({ fullPage: true });
          await attachScreenshot(testInfo, 'failure-screenshot', screenshot);
        }
      });
    }
  });
}
