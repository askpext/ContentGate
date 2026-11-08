import test from 'node:test';
import assert from 'node:assert/strict';
import { createContentGate } from '../dist/index.js';

const secret = 'PROTECTED_BODY_SENTINEL';
const metadata = { id: 'article', title: 'Title', description: 'Editorial synopsis',
  author: 'Editor', publishedAt: '2026-11-08', image: '/cover.svg', canonicalUrl: 'https://example.com/article' };

function fixture(overrides = {}) {
  const calls = [];
  const gate = createContentGate({
    authenticate: async request => {
      calls.push('authenticate');
      const token = request.headers.get('authorization');
      return ['Bearer subscriber', 'Bearer reader', 'Bearer expired'].includes(token)
        ? { id: token.slice(7) } : null;
    },
    authorize: async ({ user }) => { calls.push('authorize'); return user.id === 'subscriber'; },
    getContent: async id => { calls.push('content'); return id === 'missing' ? null : { body: secret }; },
    getMetadata: async () => ({ ...metadata, body: secret }),
    ...overrides,
  });
  return { gate, calls };
}

const request = (token, id = 'article', init = {}) => new Request(`https://publisher.test/v1/content/${id}/access`, {
  method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, ...init,
});

for (const [principal, status, expectedCalls] of [
  [undefined, 401, ['authenticate']],
  ['reader', 403, ['authenticate', 'authorize']],
  ['expired', 403, ['authenticate', 'authorize']],
  ['subscriber', 200, ['authenticate', 'authorize', 'content']],
]) {
  test(`direct HTTP request: ${principal ?? 'anonymous'} -> ${status}`, async () => {
    const { gate, calls } = fixture();
    const response = await gate.handle(request(principal));
    assert.equal(response.status, status);
    assert.deepEqual(calls, expectedCalls);
    assert.equal((await response.text()).includes(secret), status === 200);
  });
}

test('forged user identity and subscription flags confer no identity', async () => {
  const { gate, calls } = fixture();
  const response = await gate.handle(new Request('https://publisher.test/v1/content/article/access?userId=subscriber', {
    method: 'POST',
    headers: { 'x-user-id': 'subscriber', 'x-subscribed': 'true', cookie: 'user=subscriber' },
  }));
  // Query parameters cannot change the authenticated principal or route.
  assert.equal(response.status, 401);
  assert.ok(!calls.includes('content'));
  const exact = await gate.handle(request(null, 'article', {
    headers: { 'x-user-id': 'subscriber', 'x-subscribed': 'true' },
  }));
  assert.equal(exact.status, 401);
});

test('JSON identity in body is rejected before providers', async () => {
  const { gate, calls } = fixture();
  const response = await gate.handle(request(null, 'article', { body: '{"userId":"subscriber"}' }));
  assert.equal(response.status, 400);
  assert.deepEqual(calls, []);
});

test('an empty HTTP adapter stream is accepted as an empty POST', async () => {
  const { gate, calls } = fixture();
  const body = new ReadableStream({ start(controller) { controller.close(); } });
  const response = await gate.handle(request('subscriber', 'article', { body, duplex: 'half' }));
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ['authenticate', 'authorize', 'content']);
});

test('an unreadable request body is rejected before providers', async () => {
  const { gate, calls } = fixture();
  const body = new ReadableStream({ start(controller) { controller.error(new Error(secret)); } });
  const response = await gate.handle(request('subscriber', 'article', { body, duplex: 'half' }));
  assert.equal(response.status, 400);
  assert.ok(!(await response.text()).includes(secret));
  assert.deepEqual(calls, []);
});

for (const provider of ['authenticate', 'authorize', 'getContent', 'getMetadata']) {
  test(`${provider} failure is closed and sanitized`, async () => {
    const { gate, calls } = fixture({ [provider]: async () => { throw new Error(secret); } });
    const response = provider === 'getMetadata' ? await gate.metadata('article') : await gate.handle(request('subscriber'));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: { code: 'unavailable' } });
    assert.ok(!calls.includes('content'));
  });
}

for (const decision of [false, undefined, null, 'true', 1, { allowed: true }]) {
  test(`only boolean true grants access: ${JSON.stringify(decision)}`, async () => {
    const { gate, calls } = fixture({ authorize: async () => decision });
    assert.equal((await gate.handle(request('subscriber'))).status, 403);
    assert.ok(!calls.includes('content'));
  });
}

test('missing content checked only after permission; optional concealed denial', async () => {
  const { gate } = fixture();
  assert.equal((await gate.handle(request(null, 'missing'))).status, 401);
  assert.equal((await gate.handle(request('subscriber', 'missing'))).status, 404);
  const hidden = fixture({ hideDenied: true });
  assert.equal((await hidden.gate.handle(request('reader'))).status, 404);
  assert.ok(!hidden.calls.includes('content'));
});

test('metadata is public, allowlisted, and never retrieves content', async () => {
  const { gate, calls } = fixture();
  const response = await gate.handle(new Request('https://publisher.test/v1/content/article'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: metadata });
  assert.deepEqual(calls, []);
});

test('metadata rejects object-valued fields rather than serializing them', async () => {
  const { gate } = fixture({ getMetadata: async () => ({ ...metadata, title: { body: secret } }) });
  const response = await gate.metadata('article');
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes(secret));
});

for (const id of ['%ZZ', '%2Fetc', 'a.b', 'a'.repeat(129), '%00', '%252F', '%E2%98%83', 'a%0A', 'a%0D']) {
  test(`invalid identifier rejected without provider calls: ${id.slice(0, 20)}`, async () => {
    const { gate, calls } = fixture();
    assert.equal((await gate.handle(request('subscriber', id))).status, 400);
    assert.deepEqual(calls, []);
  });
}

test('unsupported routes and methods do not fetch content', async () => {
  const { gate, calls } = fixture();
  const response = await gate.handle(request('subscriber', 'article', { method: 'GET' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
  assert.equal((await gate.handle(new Request('https://publisher.test/elsewhere'))).status, 404);
  assert.deepEqual(calls, []);
});

test('serialization failure does not expose partial data', async () => {
  const { gate } = fixture({ getContent: async () => ({ body: secret, invalid: 1n }) });
  const response = await gate.handle(request('subscriber'));
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes(secret));
});

test('subscriber response cannot populate a compliant shared cache', async () => {
  const { gate } = fixture();
  let cached;
  for (const token of ['subscriber', undefined, 'reader', 'expired', 'subscriber', undefined]) {
    const response = cached?.clone() ?? await gate.handle(request(token));
    const control = response.headers.get('cache-control');
    assert.equal(control, 'private, no-store');
    assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
    assert.equal(response.headers.get('vary'), 'Authorization, Cookie');
    if (!/private|no-store/.test(control)) cached = response.clone();
    assert.equal((await response.text()).includes(secret), token === 'subscriber');
  }
  assert.equal(cached, undefined);
});

test('concurrent requests do not share authorization state', async () => {
  const { gate } = fixture();
  const responses = await Promise.all(Array.from({ length: 20 }, (_, i) => gate.handle(request(i % 2 ? 'subscriber' : undefined))));
  for (const [i, response] of responses.entries()) {
    assert.equal((await response.text()).includes(secret), Boolean(i % 2));
  }
});
