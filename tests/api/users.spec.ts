/**
 * API Test Spec — Users
 *
 * Loads data/api/users.json and dynamically generates all test cases
 * through the Universal Test Engine API runner.
 */

import { runApiSuite } from '../../src/core';

runApiSuite('api/users.json');
