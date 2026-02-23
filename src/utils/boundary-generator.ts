/**
 * Universal Test Engine — Boundary & Negative Case Generator
 *
 * Generates boundary values, edge-case strings, and negative payloads
 * that can be injected into any test dynamically.
 */

// ---------------------------------------------------------------------------
// String boundaries
// ---------------------------------------------------------------------------

export const boundaryStrings = {
  empty: '',
  singleChar: 'a',
  maxAscii: 'a'.repeat(255),
  longString: 'a'.repeat(10_000),
  unicode: '日本語テスト 🎉🚀',
  emoji: '😀😂🤣😍🥰',
  htmlInjection: '<script>alert("xss")</script>',
  sqlInjection: "' OR 1=1; DROP TABLE users; --",
  nullByte: 'hello\x00world',
  newlines: 'line1\nline2\rline3\r\nline4',
  tabs: 'col1\tcol2\tcol3',
  whitespaceOnly: '   \t\n  ',
  specialChars: '!@#$%^&*()_+-=[]{}|;:\'"<>?,./~`',
  rtlText: '\u202Eright-to-left',
  backslash: 'path\\to\\file',
  urlEncoded: '%3Cscript%3Ealert(1)%3C/script%3E',
};

// ---------------------------------------------------------------------------
// Numeric boundaries
// ---------------------------------------------------------------------------

export const boundaryNumbers = {
  zero: 0,
  one: 1,
  negativeOne: -1,
  maxSafe: Number.MAX_SAFE_INTEGER,
  minSafe: Number.MIN_SAFE_INTEGER,
  maxFloat: Number.MAX_VALUE,
  minFloat: Number.MIN_VALUE,
  infinity: Infinity,
  negativeInfinity: -Infinity,
  nan: NaN,
  epsilon: Number.EPSILON,
};

// ---------------------------------------------------------------------------
// Field-level boundary generators
// ---------------------------------------------------------------------------

export interface FieldSpec {
  name: string;
  type: 'string' | 'number' | 'email' | 'boolean' | 'integer';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  required?: boolean;
}

export interface BoundaryCase {
  description: string;
  field: string;
  value: unknown;
  expectValid: boolean;
}

/**
 * Generate boundary test cases for a given field specification.
 */
export function generateBoundaryCases(spec: FieldSpec): BoundaryCase[] {
  const cases: BoundaryCase[] = [];
  const { name, type } = spec;

  // --- Required / missing ---
  if (spec.required) {
    cases.push({ description: `${name}: missing (undefined)`, field: name, value: undefined, expectValid: false });
    cases.push({ description: `${name}: null`, field: name, value: null, expectValid: false });
  }

  // --- Type-specific ---
  switch (type) {
    case 'string': {
      const min = spec.minLength ?? 0;
      const max = spec.maxLength ?? 255;

      cases.push({ description: `${name}: empty string`, field: name, value: '', expectValid: min === 0 });
      cases.push({ description: `${name}: at minLength (${min})`, field: name, value: 'a'.repeat(min), expectValid: true });
      cases.push({ description: `${name}: below minLength`, field: name, value: 'a'.repeat(Math.max(0, min - 1)), expectValid: min <= 1 });
      cases.push({ description: `${name}: at maxLength (${max})`, field: name, value: 'a'.repeat(max), expectValid: true });
      cases.push({ description: `${name}: above maxLength`, field: name, value: 'a'.repeat(max + 1), expectValid: false });
      cases.push({ description: `${name}: unicode`, field: name, value: boundaryStrings.unicode, expectValid: true });
      cases.push({ description: `${name}: XSS attempt`, field: name, value: boundaryStrings.htmlInjection, expectValid: false });
      cases.push({ description: `${name}: SQL injection`, field: name, value: boundaryStrings.sqlInjection, expectValid: false });
      break;
    }

    case 'email': {
      cases.push({ description: `${name}: valid email`, field: name, value: 'user@example.com', expectValid: true });
      cases.push({ description: `${name}: no @`, field: name, value: 'userexample.com', expectValid: false });
      cases.push({ description: `${name}: double @`, field: name, value: 'user@@example.com', expectValid: false });
      cases.push({ description: `${name}: no domain`, field: name, value: 'user@', expectValid: false });
      cases.push({ description: `${name}: no local`, field: name, value: '@example.com', expectValid: false });
      cases.push({ description: `${name}: spaces`, field: name, value: 'user @example.com', expectValid: false });
      cases.push({ description: `${name}: unicode domain`, field: name, value: 'user@例え.jp', expectValid: true });
      break;
    }

    case 'number':
    case 'integer': {
      const min = spec.min ?? Number.MIN_SAFE_INTEGER;
      const max = spec.max ?? Number.MAX_SAFE_INTEGER;

      cases.push({ description: `${name}: zero`, field: name, value: 0, expectValid: min <= 0 && max >= 0 });
      cases.push({ description: `${name}: at min (${min})`, field: name, value: min, expectValid: true });
      cases.push({ description: `${name}: below min`, field: name, value: min - 1, expectValid: false });
      cases.push({ description: `${name}: at max (${max})`, field: name, value: max, expectValid: true });
      cases.push({ description: `${name}: above max`, field: name, value: max + 1, expectValid: false });
      cases.push({ description: `${name}: negative`, field: name, value: -1, expectValid: min <= -1 });
      cases.push({ description: `${name}: NaN`, field: name, value: NaN, expectValid: false });
      cases.push({ description: `${name}: string instead`, field: name, value: 'not-a-number', expectValid: false });

      if (type === 'integer') {
        cases.push({ description: `${name}: float`, field: name, value: 1.5, expectValid: false });
      }
      break;
    }

    case 'boolean': {
      cases.push({ description: `${name}: true`, field: name, value: true, expectValid: true });
      cases.push({ description: `${name}: false`, field: name, value: false, expectValid: true });
      cases.push({ description: `${name}: string "true"`, field: name, value: 'true', expectValid: false });
      cases.push({ description: `${name}: number 1`, field: name, value: 1, expectValid: false });
      cases.push({ description: `${name}: number 0`, field: name, value: 0, expectValid: false });
      break;
    }
  }

  return cases;
}

/**
 * Generate a negative payload: take a valid payload and replace one field at a time
 * with an invalid value.
 */
export function generateNegativePayloads(
  validPayload: Record<string, unknown>,
  specs: FieldSpec[],
): { description: string; payload: Record<string, unknown> }[] {
  const results: { description: string; payload: Record<string, unknown> }[] = [];

  for (const spec of specs) {
    const cases = generateBoundaryCases(spec).filter((c) => !c.expectValid);
    for (const c of cases) {
      results.push({
        description: c.description,
        payload: { ...validPayload, [c.field]: c.value },
      });
    }
  }

  return results;
}

/**
 * Generate a quick set of boundary values for an integer range.
 */
export function integerBoundaries(min: number, max: number): number[] {
  return [min - 1, min, min + 1, Math.floor((min + max) / 2), max - 1, max, max + 1];
}

/**
 * Generate a quick set of string length boundaries.
 */
export function stringLengthBoundaries(minLen: number, maxLen: number): string[] {
  return [
    '',
    'a'.repeat(Math.max(0, minLen - 1)),
    'a'.repeat(minLen),
    'a'.repeat(minLen + 1),
    'a'.repeat(Math.floor((minLen + maxLen) / 2)),
    'a'.repeat(maxLen - 1),
    'a'.repeat(maxLen),
    'a'.repeat(maxLen + 1),
  ];
}
