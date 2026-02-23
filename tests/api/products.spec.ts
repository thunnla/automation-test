/**
 * API Test Spec — Products
 *
 * Loads data/api/products.json and dynamically generates all test cases
 * through the Universal Test Engine API runner.
 */

import { runApiSuite } from '../../src/core';

runApiSuite('api/products.json');
