/** Global teardown: merge every worker's coverage into one report (only with COVERAGE=1). */
import MCR from 'monocart-coverage-reports';
import { coverageOptions } from './coverage-options.js';

export default async function report() {
  if (!process.env.COVERAGE) return;
  await MCR(coverageOptions).generate();
}
