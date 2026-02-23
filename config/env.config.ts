/**
 * Universal Test Engine — Environment Configuration Loader
 *
 * Resolves the active environment from:
 *   1. TEST_ENV env var  (highest priority)
 *   2. .env file
 *   3. Falls back to "dev"
 *
 * Then merges environment-specific JSON with optional .env overrides.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthConfig {
  strategy: 'bearer' | 'basic' | 'api-key' | 'none';
  tokenEndpoint?: string;
  credentials?: Record<string, string>;
  apiKey?: string;
  headerName?: string;
}

export interface FeaturesConfig {
  screenshots: boolean;
  video: 'on' | 'off' | 'retain-on-failure';
  trace: 'on' | 'off' | 'retain-on-failure';
  snapshots: boolean;
}

export interface EnvironmentConfig {
  name: string;
  apiBaseUrl: string;
  uiBaseUrl: string;
  timeout: number;
  retries: number;
  auth: AuthConfig;
  headers: Record<string, string>;
  features: FeaturesConfig;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..', '..');

// Load .env once
dotenv.config({ path: path.join(ROOT, '.env') });

function resolveEnvName(): string {
  return process.env.TEST_ENV || 'dev';
}

function loadJsonConfig(envName: string): EnvironmentConfig {
  const filePath = path.join(ROOT, 'config', 'environments', `${envName}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Environment config not found: ${filePath}\n` +
        `Available environments: ${listAvailableEnvironments().join(', ')}`,
    );
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as EnvironmentConfig;
}

function applyEnvOverrides(config: EnvironmentConfig): EnvironmentConfig {
  // Allow .env / CI variables to override JSON values
  if (process.env.API_BASE_URL) config.apiBaseUrl = process.env.API_BASE_URL;
  if (process.env.UI_BASE_URL) config.uiBaseUrl = process.env.UI_BASE_URL;
  if (process.env.TEST_TIMEOUT) config.timeout = Number(process.env.TEST_TIMEOUT);
  if (process.env.TEST_RETRIES) config.retries = Number(process.env.TEST_RETRIES);
  return config;
}

export function listAvailableEnvironments(): string[] {
  const dir = path.join(ROOT, 'config', 'environments');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));
}

/** Return the fully-resolved config for the current environment. */
export function getConfig(): EnvironmentConfig {
  const envName = resolveEnvName();
  const config = loadJsonConfig(envName);
  return applyEnvOverrides(config);
}

/** Convenience: return just the environment name string. */
export function getEnvName(): string {
  return resolveEnvName();
}

// Re-export a singleton for quick imports
export const ENV = getConfig();
