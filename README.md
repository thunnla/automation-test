# Universal Test Engine

A **framework-agnostic**, **project-independent** QA automation platform built on [Playwright](https://playwright.dev/) + TypeScript. Test any REST API or web UI — Laravel, Filament, SvelteKit, React, Next.js, Node backends, or any HTTP service — by simply pointing it at the right base URL.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Folder Structure](#folder-structure)
3. [Quick Start](#quick-start)
4. [Environment Configuration](#environment-configuration)
5. [Writing Tests (JSON)](#writing-tests-json)
6. [Tags & Filtering](#tags--filtering)
7. [Boundary & Negative Testing](#boundary--negative-testing)
8. [Snapshot / Visual Regression](#snapshot--visual-regression)
9. [Reports](#reports)
10. [CI/CD Integration](#cicd-integration)
11. [Reusing for Another Project](#reusing-for-another-project)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Playwright Runner                     │
├─────────────────────────────────────────────────────────┤
│  tests/                                                 │
│  ├── api/*.spec.ts       ← 1-liner: runApiSuite(...)   │
│  └── ui/*.spec.ts        ← 1-liner: runUiSuite(...)    │
├─────────────────────────────────────────────────────────┤
│  src/core/                                              │
│  ├── fixtures.ts         ← Custom Playwright fixtures   │
│  ├── api-runner.ts       ← Dynamic API test engine      │
│  └── ui-runner.ts        ← Dynamic UI test engine       │
├─────────────────────────────────────────────────────────┤
│  src/utils/                                             │
│  ├── data-loader.ts      ← JSON loader + interpolation  │
│  ├── schema-validator.ts ← AJV-based validation         │
│  ├── boundary-generator  ← Negative/edge-case factory   │
│  ├── auth-helper.ts      ← Pluggable auth strategies    │
│  ├── helpers.ts          ← Deep-get, deep-contains      │
│  └── report-helper.ts    ← Report attachments           │
├─────────────────────────────────────────────────────────┤
│  data/                                                  │
│  ├── api/*.json          ← API test scenarios           │
│  └── ui/*.json           ← UI test scenarios            │
├─────────────────────────────────────────────────────────┤
│  config/environments/                                   │
│  ├── dev.json                                           │
│  ├── staging.json                                       │
│  └── production.json                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
automation-test/
├── config/
│   ├── environments/
│   │   ├── dev.json              # Dev environment config
│   │   ├── staging.json          # Staging environment config
│   │   └── production.json       # Production environment config
│   └── env.config.ts             # Environment loader
├── data/
│   ├── api/
│   │   ├── users.json            # Sample API test suite
│   │   └── products.json         # Sample API test suite
│   └── ui/
│       ├── login.json            # Sample UI test suite
│       └── homepage.json         # Sample UI test suite
├── src/
│   ├── core/
│   │   ├── fixtures.ts           # Playwright fixture extensions
│   │   ├── api-runner.ts         # API test runner engine
│   │   ├── ui-runner.ts          # UI test runner engine
│   │   └── index.ts              # Barrel export
│   ├── schemas/
│   │   ├── api-test.schema.json  # JSON Schema for API tests
│   │   └── ui-test.schema.json   # JSON Schema for UI tests
│   ├── utils/
│   │   ├── auth-helper.ts        # Authentication strategies
│   │   ├── boundary-generator.ts # Boundary/negative case factory
│   │   ├── data-loader.ts        # JSON loader + interpolation
│   │   ├── helpers.ts            # Deep utilities
│   │   ├── report-helper.ts      # Report attachment utils
│   │   ├── schema-validator.ts   # AJV schema validation
│   │   └── index.ts              # Barrel export
│   └── index.ts                  # Main barrel export
├── tests/
│   ├── api/
│   │   ├── users.spec.ts         # Wires data/api/users.json
│   │   ├── products.spec.ts      # Wires data/api/products.json
│   │   └── boundary-users.spec.ts# Auto-generated boundary tests
│   ├── ui/
│   │   ├── login.spec.ts         # Wires data/ui/login.json
│   │   └── homepage.spec.ts      # Wires data/ui/homepage.json
│   ├── global-setup.ts           # Runs once before all tests
│   └── global-teardown.ts        # Runs once after all tests
├── .github/workflows/test.yml    # GitHub Actions CI
├── .gitlab-ci.yml                # GitLab CI
├── playwright.config.ts          # Playwright configuration
├── tsconfig.json
├── package.json
└── README.md
```

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# Clone / copy this engine into your workspace
cd automation-test

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

### Run All Tests (local / dev)

```bash
# Default: uses config/environments/dev.json
npm test
```

### Run by Category

```bash
npm run test:api         # API tests only
npm run test:ui          # UI tests only
npm run test:smoke       # Smoke-tagged tests
npm run test:regression  # Regression-tagged tests
npm run test:critical    # Critical-tagged tests
npm run test:negative    # Negative tests
npm run test:boundary    # Boundary tests
```

### Run Against a Specific Environment

```bash
npm run test:dev         # → config/environments/dev.json
npm run test:staging     # → config/environments/staging.json
npm run test:prod        # → config/environments/production.json

# Or override inline:
TEST_ENV=staging npx playwright test --grep @smoke
```

### Debug & Interactive

```bash
npm run test:headed      # Run with visible browser
npm run test:debug       # Step-through debugger
npm run test:report      # Open HTML report
```

---

## Environment Configuration

Each environment has its own JSON file in `config/environments/`:

```jsonc
{
  "name": "staging",
  "apiBaseUrl": "https://staging-api.example.com/api",
  "uiBaseUrl": "https://staging.example.com",
  "timeout": 45000,
  "retries": 1,
  "auth": {
    "strategy": "bearer",           // bearer | basic | api-key | none
    "tokenEndpoint": "/auth/login",
    "credentials": { "email": "qa@example.com", "password": "..." }
  },
  "headers": { "Accept": "application/json" },
  "features": {
    "screenshots": true,
    "video": "retain-on-failure",   // on | off | retain-on-failure
    "trace": "retain-on-failure",
    "snapshots": true
  }
}
```

**Priority chain:**  `TEST_ENV` env var → `.env` file → `"dev"` fallback.

You can also override individual values via environment variables:

| Variable | Overrides |
|---|---|
| `API_BASE_URL` | `apiBaseUrl` |
| `UI_BASE_URL` | `uiBaseUrl` |
| `TEST_TIMEOUT` | `timeout` |
| `TEST_RETRIES` | `retries` |

---

## Writing Tests (JSON)

### API Test Structure

```json
{
  "suite": "Users API",
  "tags": ["smoke", "api"],
  "baseEndpoint": "/users",
  "setup": { "method": "POST", "endpoint": "/auth/login", "body": {...}, "extractToken": {...} },
  "tests": [
    {
      "name": "GET /users — list all",
      "tags": ["smoke"],
      "method": "GET",
      "endpoint": "",
      "expect": {
        "status": 200,
        "bodySchema": { "type": "object", "required": ["data"] },
        "bodyPath": [{ "path": "data", "type": "object" }],
        "responseTime": 3000
      }
    }
  ]
}
```

**Supported assertions:**
- `status` — exact status code
- `statusRange` — `{ min, max }`
- `bodyContains` — partial deep match
- `bodyExact` — exact deep match
- `bodySchema` — JSON Schema (AJV)
- `bodyPath` — asserting on specific paths (`equals`, `contains`, `type`, `minLength`, `maxLength`, `regex`)
- `headers` — response header checks
- `responseTime` — max response time in ms

### UI Test Structure

```json
{
  "suite": "Login Page",
  "tags": ["smoke", "ui"],
  "tests": [
    {
      "name": "Successful login",
      "url": "/login",
      "steps": [
        { "action": "fill", "selector": "input[name='email']", "value": "admin@example.com" },
        { "action": "fill", "selector": "input[name='password']", "value": "password" },
        { "action": "click", "selector": "button[type='submit']" },
        { "action": "waitForURL", "value": "**/dashboard**" },
        { "action": "assertVisible", "selector": "[data-testid='dashboard']" }
      ],
      "snapshot": { "name": "dashboard-after-login", "fullPage": true }
    }
  ]
}
```

**Supported UI actions:**
`goto`, `click`, `fill`, `select`, `check`, `uncheck`, `hover`, `press`, `wait`, `waitForSelector`, `waitForURL`, `scroll`, `upload`, `evaluate`, `screenshot`

**Supported UI assertions:**
`assertVisible`, `assertHidden`, `assertText`, `assertValue`, `assertURL`, `assertTitle`, `assertCount`

### Variable Interpolation

Use `{{variableName}}` in endpoints, bodies, or auth fields:

```json
{ "endpoint": "/users/{{userId}}", "auth": "{{token}}" }
```

Variables can come from:
- `setup.extractToken` (auto-extracted from login response)
- `dataInjection` on each test case

---

## Tags & Filtering

Tag your test cases in JSON:

```json
{ "tags": ["smoke", "critical", "api"] }
```

Tags are appended to the Playwright test title as `@tag`, enabling native grep:

```bash
npx playwright test --grep @smoke           # Run only smoke tests
npx playwright test --grep "@smoke|@critical" # Smoke OR critical
npx playwright test --grep-invert @negative   # Exclude negative tests
```

Predefined npm scripts: `test:smoke`, `test:regression`, `test:critical`, `test:negative`, `test:boundary`.

---

## Boundary & Negative Testing

### Auto-Generated Payloads

Define field specs and get dozens of edge-case payloads automatically:

```typescript
import { generateNegativePayloads, FieldSpec } from '../../src/utils';

const fields: FieldSpec[] = [
  { name: 'email', type: 'email', required: true },
  { name: 'age', type: 'integer', min: 0, max: 150 },
];

const negatives = generateNegativePayloads(validPayload, fields);
// → XSS, SQL injection, empty, null, too-long, wrong type, etc.
```

### Built-in Boundary Generators:
- `integerBoundaries(min, max)` — `[min-1, min, min+1, mid, max-1, max, max+1]`
- `stringLengthBoundaries(minLen, maxLen)` — `['', below-min, at-min, ..., above-max]`
- `boundaryStrings` — XSS, SQL injection, unicode, special chars, etc.
- `boundaryNumbers` — 0, -1, MAX_SAFE_INTEGER, NaN, Infinity, etc.

See `tests/api/boundary-users.spec.ts` for a complete example.

---

## Snapshot / Visual Regression

Add a `snapshot` block to any UI test:

```json
{
  "snapshot": {
    "name": "login-page",
    "fullPage": true,
    "selector": "#main"
  }
}
```

Snapshots are stored in `snapshots/` and compared on each run. Update baselines:

```bash
npx playwright test --update-snapshots
```

---

## Reports

The engine generates multiple report formats automatically:

| Format | Location | Purpose |
|---|---|---|
| HTML | `reports/html/` | Interactive browser report |
| JSON | `reports/results.json` | Machine-readable results |
| JUnit XML | `reports/results.xml` | CI integration (Jenkins, etc.) |
| Summary | `reports/summary.json` | Quick pass/fail overview |

**Open the HTML report:**

```bash
npm run test:report
```

Additional report features:
- **Failure screenshots** — automatically captured and attached
- **Video recording** — configurable per environment (`on`, `off`, `retain-on-failure`)
- **Trace files** — full execution trace for debugging
- **Request/response logging** — attached as JSON to each API test

---

## CI/CD Integration

### GitHub Actions

Pre-configured in `.github/workflows/test.yml`:
- Schema validation → API tests → UI tests (parallel per browser) → merged report
- Manual trigger with environment + tag selection

### GitLab CI

Pre-configured in `.gitlab-ci.yml`:
- Same pipeline stages with GitLab-native artifacts

### Generic CI

```bash
# Install
npm ci
npx playwright install --with-deps

# Run with environment
TEST_ENV=staging npx playwright test

# Run specific tags
npx playwright test --grep @smoke
npx playwright test --project=api --grep @critical

# Results in reports/
```

---

## Reusing for Another Project

### Step-by-step:

1. **Copy or clone** this engine into a standalone directory (or use as a git submodule).

2. **Add a new environment** config:
   ```bash
   cp config/environments/dev.json config/environments/my-project-dev.json
   # Edit apiBaseUrl, uiBaseUrl, auth settings
   ```

3. **Create JSON test files** in `data/api/` and `data/ui/`:
   ```bash
   data/api/my-feature.json
   data/ui/my-page.json
   ```

4. **Create a 1-line spec file** in `tests/`:
   ```typescript
   // tests/api/my-feature.spec.ts
   import { runApiSuite } from '../../src/core';
   runApiSuite('api/my-feature.json');
   ```

5. **Run:**
   ```bash
   TEST_ENV=my-project-dev npx playwright test
   ```

### What makes it universal:

| Concern | How it's decoupled |
|---|---|
| Base URLs | Environment JSON files, never hardcoded |
| Auth | Pluggable strategies (bearer, basic, api-key, none) |
| Test data | External JSON files, not in code |
| Assertions | Declarative in JSON, engine handles execution |
| Browsers | Configurable via Playwright projects |
| CI/CD | Generic — works with any CI system |

### Example: Testing a Laravel API

```json
// config/environments/laravel-local.json
{
  "name": "laravel-local",
  "apiBaseUrl": "http://localhost:8000/api",
  "uiBaseUrl": "http://localhost:8000",
  "auth": { "strategy": "bearer", "tokenEndpoint": "/login", "credentials": { "email": "admin@app.com", "password": "password" } }
}
```

### Example: Testing a SvelteKit App

```json
// config/environments/sveltekit-dev.json
{
  "name": "sveltekit-dev",
  "apiBaseUrl": "http://localhost:5173/api",
  "uiBaseUrl": "http://localhost:5173",
  "auth": { "strategy": "none" }
}
```

---

## License

MIT — Use freely across all your projects.
