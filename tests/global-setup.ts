/**
 * Universal Test Engine — Global Setup
 *
 * Runs once before the entire test suite.
 * Used to prepare environment, warm up services, etc.
 */

import { FullConfig } from '@playwright/test';
import { getConfig, getEnvName } from '../config/env.config';

async function globalSetup(config: FullConfig): Promise<void> {
  const env = getConfig();
  const envName = getEnvName();

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       Universal Test Engine — Starting          ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Environment : ${envName.padEnd(34)}║`);
  console.log(`║  API Base    : ${env.apiBaseUrl.padEnd(34).slice(0, 34)}║`);
  console.log(`║  UI Base     : ${env.uiBaseUrl.padEnd(34).slice(0, 34)}║`);
  console.log(`║  Retries     : ${String(env.retries).padEnd(34)}║`);
  console.log(`║  Timeout     : ${(env.timeout + 'ms').padEnd(34)}║`);
  console.log('╚══════════════════════════════════════════════════╝');
}

export default globalSetup;
