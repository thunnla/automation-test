/**
 * Boundary & Negative Test Spec — User Registration Fields
 *
 * Demonstrates the boundary-generator utility: automatically creates
 * dozens of edge-case payloads for each field specification, then runs
 * them through the API.
 *
 * Tag: @boundary @negative @api
 */

import { test, expect } from '../../src/core';
import {
  generateNegativePayloads,
  FieldSpec,
  integerBoundaries,
  stringLengthBoundaries,
  boundaryStrings,
} from '../../src/utils';
import { attachJson } from '../../src/utils/report-helper';

// ---------------------------------------------------------------------------
// Field specs for the "Create User" endpoint
// ---------------------------------------------------------------------------

const USER_FIELDS: FieldSpec[] = [
  { name: 'name', type: 'string', minLength: 1, maxLength: 255, required: true },
  { name: 'email', type: 'email', required: true },
  { name: 'password', type: 'string', minLength: 8, maxLength: 128, required: true },
  { name: 'age', type: 'integer', min: 0, max: 150, required: false },
];

const VALID_PAYLOAD = {
  name: 'Valid User',
  email: 'valid@example.com',
  password: 'securePass123',
  age: 30,
};

// ---------------------------------------------------------------------------
// Auto-generated negative payloads
// ---------------------------------------------------------------------------

const negativePayloads = generateNegativePayloads(VALID_PAYLOAD, USER_FIELDS);

test.describe('[API] User Registration — Boundary & Negative Tests @boundary @negative @api', () => {
  for (const neg of negativePayloads) {
    test(`Rejects: ${neg.description}`, async ({ apiContext }, testInfo) => {
      const res = await apiContext.post('/users', { data: neg.payload });

      await attachJson(testInfo, 'Payload', neg.payload);
      await attachJson(testInfo, 'Response', {
        status: res.status(),
        body: await res.json().catch(() => null),
      });

      // Should be rejected — anything other than 2xx
      expect(res.status(), `Should reject invalid payload`).toBeGreaterThanOrEqual(400);
    });
  }

  // ---- Integer boundary tests for "age" ----
  const ageBoundaries = integerBoundaries(0, 150);

  for (const age of ageBoundaries) {
    const shouldPass = age >= 0 && age <= 150;
    test(`Age boundary: ${age} — expect ${shouldPass ? 'accept' : 'reject'} @boundary @api`, async ({
      apiContext,
    }) => {
      const res = await apiContext.post('/users', {
        data: { ...VALID_PAYLOAD, age },
      });

      if (shouldPass) {
        expect(res.status()).toBeLessThan(400);
      } else {
        expect(res.status()).toBeGreaterThanOrEqual(400);
      }
    });
  }

  // ---- String length boundary tests for "name" ----
  const nameLengths = stringLengthBoundaries(1, 255);

  for (const name of nameLengths) {
    const shouldPass = name.length >= 1 && name.length <= 255;
    test(`Name length ${name.length} — expect ${shouldPass ? 'accept' : 'reject'} @boundary @api`, async ({
      apiContext,
    }) => {
      const res = await apiContext.post('/users', {
        data: { ...VALID_PAYLOAD, name },
      });

      if (shouldPass) {
        expect(res.status()).toBeLessThan(400);
      } else {
        expect(res.status()).toBeGreaterThanOrEqual(400);
      }
    });
  }

  // ---- Security injection tests ----
  test('Rejects HTML/XSS in name field @negative @api', async ({ apiContext }) => {
    const res = await apiContext.post('/users', {
      data: { ...VALID_PAYLOAD, name: boundaryStrings.htmlInjection },
    });
    // Should either reject or sanitize
    if (res.ok()) {
      const body = await res.json();
      expect(body.data?.name).not.toContain('<script>');
    }
  });

  test('Rejects SQL injection in email field @negative @api', async ({ apiContext }) => {
    const res = await apiContext.post('/users', {
      data: { ...VALID_PAYLOAD, email: boundaryStrings.sqlInjection },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
