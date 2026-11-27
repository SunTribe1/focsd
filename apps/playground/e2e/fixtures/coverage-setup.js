/** Global setup: start from an empty coverage cache (only with COVERAGE=1). */
import MCR from 'monocart-coverage-reports';
import { coverageOptions } from './coverage-options.js';

export default async function setup() {
  if (!process.env.COVERAGE) return;
  await MCR(coverageOptions).cleanCache();
}
