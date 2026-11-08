import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { createContentGate } from 'contentgate';
import { articles } from './catalog';
import { getPrivateArticle } from './private-content';

function matches(candidate: string, expected: string | undefined) {
  if (!expected || expected.length < 32) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const gate = createContentGate({
  // Replace this entire mock with your existing verified session/token provider.
  authenticate: async (request) => {
    const header = request.headers.get('authorization');
    const cookie = request.headers.get('cookie')?.split(';').map(value => value.trim())
      .find(value => value.startsWith('contentgate_demo='))?.slice('contentgate_demo='.length);
    const token = header !== null ? (/^Bearer (\S+)$/.exec(header)?.[1] ?? '') : (cookie ?? '');
    if (matches(token, process.env.DEMO_SUBSCRIBER_TOKEN)) return { id: 'subscriber', expiresAt: Infinity };
    if (matches(token, process.env.DEMO_READER_TOKEN)) return { id: 'reader', expiresAt: 0 };
    if (matches(token, process.env.DEMO_EXPIRED_TOKEN)) return { id: 'expired', expiresAt: 1 };
    return null;
  },
  // Replace with a server-side subscription/entitlement lookup per contentId.
  authorize: async ({ user }) => user.expiresAt > Date.now(),
  getContent: getPrivateArticle,
  getMetadata: async id => articles.find(article => article.id === id) ?? null,
});
