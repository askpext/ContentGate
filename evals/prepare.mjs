import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const cases = ['api-order', 'metadata-projection', 'shared-cache'];
const run = process.argv[2];
if (!run || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(run)) {
  throw new Error('Usage: node evals/prepare.mjs <new-run-name> (lowercase letters, digits, hyphens)');
}
const base = new URL(`../test-results/skill-evals/${run}/`, import.meta.url);
await mkdir(new URL('../', base), { recursive: true });
// Never overwrite a previous agent run or its evidence.
await mkdir(base);
for (const name of cases) {
  const target = new URL(`${name}/`, base);
  await mkdir(target);
  await copyFile(new URL(`fixtures/${name}/app.mjs`, import.meta.url), new URL('app.mjs', target));
  await copyFile(new URL('providers.mjs', import.meta.url), new URL('providers.mjs', target));
  await writeFile(new URL('TASK.md', target), `Use $contentgate to protect subscriber articles in this application using its existing providers. Preserve public metadata and authorized access. Fix delivery paths present in app.mjs, add local regression tests, and report evidence and remaining limits. Do not add a ContentGate runtime dependency.\n\nThis is a local synthetic application. The app exports handle(Request) and reset(). Providers are fixed evaluation substitutes for existing publisher services: do not edit providers.mjs. Dummy Bearer credentials are fixture-paid, fixture-free, fixture-expired, fixture-auth-error, and fixture-policy-error. No network or deployment is involved. Work only in this case directory.\n`);
}
console.log(`Prepared isolated cases at ${fileURLToPath(base)}`);
