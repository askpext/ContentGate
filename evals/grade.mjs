import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const marker = 'CONTENTGATE_EVAL_PRIVATE_7B19';
const caseNames = ['api-order', 'metadata-projection', 'shared-cache'];

export async function grade(directory, name) {
  assert.ok(caseNames.includes(name), 'Unknown evaluation case');
  const base = pathToFileURL(resolve(directory) + '/');
  // Providers are the fixed test oracle; changing entitlement/data to pass is not a repair.
  assert.equal(await readFile(new URL('providers.mjs', base), 'utf8'),
    await readFile(new URL('providers.mjs', import.meta.url), 'utf8'), 'Evaluation providers changed');
  const app = await import(new URL('app.mjs', base));
  const provider = await import(new URL('providers.mjs', base));
  const results = [];
  async function check(label, fn) {
    app.reset(); provider.resetProviders();
    try { await fn(); results.push({ check: label, passed: true }); }
    catch (error) { results.push({ check: label, passed: false, reason: error.message }); }
  }
  const request = (path, token, extra = {}) => new Request(`https://fixture.invalid${path}`, {
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra },
  });
  function privateResponse(response) { assert.match(response.headers.get('cache-control') ?? '', /(?:^|[,\s])no-store(?:$|[,\s])/); }
  async function denied(path, token, status, extra) {
    const response = await app.handle(request(path, token, extra));
    assert.equal(response.status, status);
    assert.ok(!(await response.text()).includes(marker), 'Private text in denied response');
    assert.equal(provider.bodyReads(), 0, 'Body retrieved before permission');
    privateResponse(response);
  }
  for (const [token, status] of [[null, 401], ['fixture-free', 403], ['fixture-expired', 403], ['fixture-auth-error', 503], ['fixture-policy-error', 503]]) {
    await check(`api rejects ${token ?? 'anonymous'} without retrieval`, () => denied('/api/story', token, status));
  }
  await check('forged reader identity is rejected', () => denied('/api/story?subscribed=true', null, 401, { 'x-user-id': 'paid' }));
  await check('article-specific denial is preserved', () => denied('/api/restricted', 'fixture-paid', 403));
  await check('permitted reader receives the body', async () => {
    const response = await app.handle(request('/api/story', 'fixture-paid'));
    assert.equal(response.status, 200); assert.ok((await response.text()).includes(marker));
    assert.equal(provider.bodyReads(), 1); privateResponse(response);
  });
  await check('missing content returns 404', async () => {
    assert.equal((await app.handle(request('/api/missing', 'fixture-paid'))).status, 404);
  });
  await check('malformed identifier never reaches storage', () => denied('/api/bad%2Fid', 'fixture-paid', 400));
  await check('metadata stays public without body retrieval', async () => {
    const response = await app.handle(request('/metadata/story'));
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.deepEqual(value, { data: { id: 'story', title: 'A public headline', description: 'A genuine public synopsis.' } });
    assert.equal(provider.bodyReads(), 0);
  });
  await check('concurrent readers do not share access', async () => {
    const responses = await Promise.all([app.handle(request('/api/story', 'fixture-paid')), app.handle(request('/api/story'))]);
    assert.ok((await responses[0].text()).includes(marker));
    assert.equal(responses[1].status, 401); assert.ok(!(await responses[1].text()).includes(marker));
    assert.equal(provider.bodyReads(), 1);
  });
  if (name === 'shared-cache') {
    await check('subscriber HTML is private/no-store', async () => {
      const response = await app.handle(request('/articles/story', 'fixture-paid'));
      assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/html/);
      assert.ok((await response.text()).includes(marker)); privateResponse(response);
    });
    await check('subscriber then anonymous HTML does not leak', async () => {
      await app.handle(request('/articles/story', 'fixture-paid'));
      provider.resetProviders();
      await denied('/articles/story', null, 401);
    });
    await check('anonymous then subscriber still delivers permitted HTML', async () => {
      await denied('/articles/story', null, 401);
      const response = await app.handle(request('/articles/story', 'fixture-paid'));
      assert.equal(response.status, 200); assert.ok((await response.text()).includes(marker));
    });
    await check('direct CMS route requires authentication', () => denied('/cms/story', null, 401));
    await check('direct CMS route respects expired subscriptions', () => denied('/cms/story', 'fixture-expired', 403));
    await check('direct CMS route retains authorized access', async () => {
      const response = await app.handle(request('/cms/story', 'fixture-paid'));
      assert.equal(response.status, 200); assert.ok((await response.text()).includes(marker)); privateResponse(response);
    });
  }
  return { case: name, passed: results.filter(item => item.passed).length, total: results.length, results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , directory, name] = process.argv;
  assert.ok(directory && name, 'Usage: node evals/grade.mjs <isolated-case-directory> <case-name>');
  const result = await grade(directory, name);
  console.log(JSON.stringify(result, null, 2));
  if (result.passed !== result.total) process.exitCode = 1;
}
