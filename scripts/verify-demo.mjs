import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const demo = join(root, 'examples', 'nextjs-blog');
const tokens = Object.fromEntries(['SUBSCRIBER', 'READER', 'EXPIRED'].map(key => [key, randomBytes(32).toString('hex')]));
const port = 3137;
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: demo,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...Object.fromEntries(Object.entries(tokens).map(([k, v]) => [`DEMO_${k}_TOKEN`, v])) },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });
let spawnError;
child.on('error', error => { spawnError = error; });
const exited = new Promise(resolve => child.on('close', resolve));
const markers = ['CONTENTGATE_PRIVATE_BOUNDARY_7F3A', 'CONTENTGATE_PRIVATE_STACK_9B2C'];
const ids = ['the-public-boundary', 'a-smaller-stack'];
let checks = 0;

function noBody(text) { for (const marker of markers) assert.ok(!text.includes(marker), 'Protected body leaked'); }
function noCache(response) {
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
}
async function get(path, init) { return fetch(origin + path, { ...init, signal: AbortSignal.timeout(8000) }); }
async function* files(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) yield* files(path); else yield path;
  }
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error(`Demo exited: ${logs}`);
    try {
      const response = await get('/');
      if (response.ok) { ready = true; break; }
    } catch { /* Server may still be starting. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, `Demo startup timed out: ${logs}`);
  const home = await get('/');
  noBody(await home.text()); checks++;

  for (const [index, id] of ids.entries()) {
    const api = `/v1/content/${id}/access`;
    for (const [principal, expected] of [[null, 401], ['READER', 403], ['EXPIRED', 403], ['SUBSCRIBER', 200], [null, 401]]) {
      const headers = principal ? { authorization: `Bearer ${tokens[principal]}` } : {};
      const response = await get(api, { method: 'POST', headers });
      assert.equal(response.status, expected); noCache(response);
      const text = await response.text();
      if (expected === 200) assert.ok(text.includes(markers[index])); else noBody(text);
      checks++;
      // fetch never executes JavaScript: inspect the complete server HTML/RSC payload,
      // including inline scripts, rather than only checking visible paywall text.
      const page = await get(`/articles/${id}`, { headers });
      assert.equal(page.status, 200); noCache(page);
      const html = await page.text();
      if (expected === 200) assert.ok(html.includes(markers[index]));
      else { noBody(html); assert.ok(html.includes('Reserved for subscribers.')); }
      checks++;
    }
    const publicResponse = await get(`/v1/content/${id}`);
    assert.equal(publicResponse.status, 200); noBody(await publicResponse.text()); checks++;
    const cookiePage = await get(`/articles/${id}`, { headers: { cookie: `contentgate_demo=${tokens.SUBSCRIBER}` } });
    noCache(cookiePage); assert.ok((await cookiePage.text()).includes(markers[index])); checks++;
    const forged = await get(api + '?userId=subscriber&subscribed=true', { method: 'POST', headers: { 'x-user-id': 'subscriber', cookie: 'contentgate_demo=subscriber' } });
    assert.equal(forged.status, 401); noBody(await forged.text()); checks++;
    const bot = await get(`/articles/${id}`, { headers: { 'user-agent': 'Googlebot' } });
    noBody(await bot.text()); checks++;
    const rsc = await get(`/articles/${id}?_rsc=verification`, { headers: { RSC: '1' } });
    noCache(rsc); noBody(await rsc.text()); checks++;
  }
  for (const [path, init, expected] of [
    ['/v1/content/the-public-boundary/access', { method: 'GET' }, 405],
    ['/v1/content/bad%2Fid/access', { method: 'POST' }, 400],
    ['/v1/content/the-public-boundary/access', { method: 'POST', body: '{"userId":"subscriber"}' }, 400],
    ['/v1/content/missing/access', { method: 'POST', headers: { authorization: `Bearer ${tokens.SUBSCRIBER}` } }, 404],
  ]) {
    const response = await get(path, init); assert.equal(response.status, expected);
    noCache(response); noBody(await response.text()); checks++;
  }
  // No private fixture body or test credentials may enter publicly served assets.
  for await (const path of files(join(demo, '.next', 'static'))) {
    const text = await readFile(path, 'utf8'); noBody(text);
    for (const token of Object.values(tokens)) assert.ok(!text.includes(token));
  }
  checks++;
  for (const token of Object.values(tokens)) assert.ok(!logs.includes(token), 'Credential logged');
  console.log(`Demo verified: ${checks} checks passed (HTTP, no-JS HTML, RSC, cache headers, static assets).`);
} finally {
  child.kill();
  await exited;
}
