import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { grade } from '../evals/grade.mjs';

const root = fileURLToPath(new URL('../test-results/', import.meta.url));
await mkdir(root, { recursive: true });
const run = await mkdtemp(join(root, 'fixture-baseline-'));
const expectedFailures = {
  'api-order': ['api rejects anonymous without retrieval', 'forged reader identity is rejected', 'missing content returns 404'],
  'metadata-projection': ['metadata stays public without body retrieval', 'api rejects fixture-auth-error without retrieval', 'api rejects fixture-policy-error without retrieval'],
  'shared-cache': ['subscriber HTML is private/no-store', 'subscriber then anonymous HTML does not leak', 'direct CMS route requires authentication'],
};

for (const [name, failures] of Object.entries(expectedFailures)) {
  test(`evaluation detects seeded defects in ${name} with a working positive control`, async () => {
    const directory = join(run, name);
    await mkdir(directory);
    await copyFile(new URL(`../evals/fixtures/${name}/app.mjs`, import.meta.url), join(directory, 'app.mjs'));
    await copyFile(new URL('../evals/providers.mjs', import.meta.url), join(directory, 'providers.mjs'));
    const result = await grade(directory, name);
    for (const failure of failures) assert.equal(result.results.find(item => item.check === failure)?.passed, false, failure);
    assert.equal(result.results.find(item => item.check === 'permitted reader receives the body')?.passed, true);
    assert.ok(result.passed < result.total);
  });
}
