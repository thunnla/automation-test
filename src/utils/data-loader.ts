/**
 * Universal Test Engine — Test Data Loader
 *
 * Loads JSON test files from the data/ directory, resolves variable
 * interpolation ({{var}}), and merges injected data.
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateTestData, TestType } from './schema-validator';

// ---------------------------------------------------------------------------
// Types  (kept deliberately loose so callers can cast to their domain types)
// ---------------------------------------------------------------------------

export interface TestSuiteFile {
  suite: string;
  tags?: string[];
  [key: string]: unknown;
  tests: TestCaseRaw[];
}

export interface TestCaseRaw {
  name: string;
  tags?: string[];
  skip?: boolean;
  only?: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

/**
 * Load and validate a single JSON test file.
 */
export function loadTestFile<T extends TestSuiteFile = TestSuiteFile>(
  relativePath: string,
  type: TestType,
): T {
  const fullPath = path.resolve(DATA_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Test data file not found: ${fullPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

  const validation = validateTestData(raw, type);
  if (!validation.valid) {
    throw new Error(
      `Schema validation failed for ${relativePath}:\n  ${validation.errors.join('\n  ')}`,
    );
  }

  return raw as T;
}

/**
 * Load all JSON files in a subdirectory of data/.
 */
export function loadAllTestFiles<T extends TestSuiteFile = TestSuiteFile>(
  subdir: string,
  type: TestType,
): T[] {
  const dir = path.join(DATA_DIR, subdir);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => loadTestFile<T>(path.join(subdir, f), type));
}

// ---------------------------------------------------------------------------
// Variable interpolation  {{varName}}
// ---------------------------------------------------------------------------

const INTERPOLATION_RE = /\{\{(\w+)\}\}/g;

/**
 * Deep-replace `{{key}}` placeholders in an object tree.
 */
export function interpolate<T>(obj: T, vars: Record<string, string>): T {
  if (typeof obj === 'string') {
    return obj.replace(INTERPOLATION_RE, (_, key) => vars[key] ?? `{{${key}}}`) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => interpolate(item, vars)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = interpolate(v, vars);
    }
    return result as T;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// Tag filtering
// ---------------------------------------------------------------------------

/**
 * Filter test cases by tag(s).  Returns all tests if `filterTags` is empty.
 */
export function filterByTags<T extends TestCaseRaw>(tests: T[], filterTags: string[]): T[] {
  if (!filterTags.length) return tests;
  return tests.filter((t) => t.tags?.some((tag) => filterTags.includes(tag)));
}
