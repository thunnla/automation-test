/**
 * Universal Test Engine — JSON Schema Validator
 *
 * Validates test JSON files against their respective schemas.
 * Can be used at test-load-time or as a standalone CLI check.
 */

import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

import apiSchema from '../schemas/api-test.schema.json';
import uiSchema from '../schemas/ui-test.schema.json';

// ---------------------------------------------------------------------------
// Singleton AJV instance
// ---------------------------------------------------------------------------

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

const validators: Record<string, ValidateFunction> = {
  api: ajv.compile(apiSchema),
  ui: ajv.compile(uiSchema),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type TestType = 'api' | 'ui';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a parsed JSON object against the engine schema.
 */
export function validateTestData(data: unknown, type: TestType): ValidationResult {
  const validate = validators[type];
  if (!validate) {
    return { valid: false, errors: [`Unknown test type: "${type}"`] };
  }
  const valid = validate(data) as boolean;
  const errors = valid
    ? []
    : (validate.errors ?? []).map(
        (e) => `${e.instancePath || '/'} ${e.message} ${JSON.stringify(e.params)}`,
      );
  return { valid, errors };
}

/**
 * Validate a JSON file on disk.
 */
export function validateTestFile(filePath: string, type: TestType): ValidationResult {
  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`File not found: ${filePath}`] };
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { valid: false, errors: [`Invalid JSON in ${filePath}`] };
  }
  return validateTestData(data, type);
}

/**
 * Validate a JSON Schema fragment (for bodySchema assertions inside tests).
 */
export function validateAgainstSchema(data: unknown, schema: object): ValidationResult {
  const validate = ajv.compile(schema);
  const valid = validate(data) as boolean;
  const errors = valid
    ? []
    : (validate.errors ?? []).map(
        (e) => `${e.instancePath || '/'} ${e.message} ${JSON.stringify(e.params)}`,
      );
  return { valid, errors };
}

// ---------------------------------------------------------------------------
// CLI mode — validate all JSON files in data/ directory
// ---------------------------------------------------------------------------

if (require.main === module) {
  const dataDir = path.resolve(__dirname, '..', '..', 'data');
  const dirs: { folder: string; type: TestType }[] = [
    { folder: path.join(dataDir, 'api'), type: 'api' },
    { folder: path.join(dataDir, 'ui'), type: 'ui' },
  ];

  let hasErrors = false;
  for (const { folder, type } of dirs) {
    if (!fs.existsSync(folder)) continue;
    const files = fs.readdirSync(folder).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const full = path.join(folder, file);
      const result = validateTestFile(full, type);
      if (result.valid) {
        console.log(`✓ ${type}/${file}`);
      } else {
        console.error(`✗ ${type}/${file}`);
        result.errors.forEach((e) => console.error(`    ${e}`));
        hasErrors = true;
      }
    }
  }
  process.exit(hasErrors ? 1 : 0);
}
