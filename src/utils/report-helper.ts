/**
 * Universal Test Engine — Report Helper
 *
 * Attaches rich metadata, screenshots, and trace links to Playwright's
 * built-in HTML report.
 */

import { TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Attach a JSON payload to the report (useful for request/response logging).
 */
export async function attachJson(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  await testInfo.attach(name, {
    body: JSON.stringify(data, null, 2),
    contentType: 'application/json',
  });
}

/**
 * Attach a plain-text note.
 */
export async function attachText(testInfo: TestInfo, name: string, text: string): Promise<void> {
  await testInfo.attach(name, {
    body: text,
    contentType: 'text/plain',
  });
}

/**
 * Attach a screenshot buffer.
 */
export async function attachScreenshot(
  testInfo: TestInfo,
  name: string,
  buffer: Buffer,
): Promise<void> {
  await testInfo.attach(name, {
    body: buffer,
    contentType: 'image/png',
  });
}

/**
 * Write a lightweight JSON summary after the full run completes.
 * Called from a global teardown or a custom reporter.
 */
export function writeSummary(
  outputDir: string,
  data: {
    environment: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    timestamp: string;
  },
): void {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'summary.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
