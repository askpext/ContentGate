import type { ContentGateOptions, ErrorCode, PublicMetadata } from './types.js';

const validId = (id: string): boolean => typeof id === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.exec(id)?.[0] === id;

// Every outcome, including metadata and errors, is uncached by default.
function json(value: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(value, { status, headers: {
    'Cache-Control': 'private, no-store',
    'CDN-Cache-Control': 'no-store',
    'Vary': 'Authorization, Cookie',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  } });
}

function error(code: ErrorCode, status: number, headers?: Record<string, string>): Response {
  return json({ error: { code } }, status, headers);
}

async function hasBody(request: Request): Promise<boolean> {
  if (request.body === null) return false;
  const reader = request.body.getReader();
  try {
    // HTTP adapters can supply a stream for a zero-length POST. Inspect at most
    // one chunk, never buffer an arbitrarily large untrusted request body.
    const { done } = await reader.read();
    if (!done) void reader.cancel().catch(() => {});
    return !done;
  } finally {
    reader.releaseLock();
  }
}

// Project fields explicitly: structural typing alone cannot strip a CMS body.
function publicFields(value: PublicMetadata, id: string): PublicMetadata {
  const fields = ['title', 'description', 'author', 'publishedAt', 'image', 'canonicalUrl'] as const;
  for (const key of fields) {
    if (typeof value[key] !== 'string') throw new TypeError('Invalid metadata');
  }
  return {
    id, title: value.title, description: value.description, author: value.author,
    publishedAt: value.publishedAt, image: value.image, canonicalUrl: value.canonicalUrl,
  };
}

export function createContentGate<User extends object, Content>(options: ContentGateOptions<User, Content>) {
  async function access(request: Request, contentId: string): Promise<Response> {
    if (!validId(contentId)) return error('invalid_request', 400);
    if (request.method !== 'POST') return error('method_not_allowed', 405, { Allow: 'POST' });
    // This contract has no request body; identity comes solely from authenticate.
    try {
      if (await hasBody(request)) return error('invalid_request', 400);
    } catch {
      return error('invalid_request', 400);
    }
    try {
      const user = await options.authenticate(request);
      if (user == null) return error('unauthenticated', 401);
      if (await options.authorize({ user, contentId }) !== true) {
        return options.hideDenied ? error('not_found', 404) : error('forbidden', 403);
      }
      const content = await options.getContent(contentId);
      if (content == null) return error('not_found', 404);
      return json({ data: content });
    } catch {
      // Provider errors and serialization failures must never echo content or credentials.
      return error('unavailable', 503);
    }
  }

  async function metadata(contentId: string): Promise<Response> {
    if (!validId(contentId)) return error('invalid_request', 400);
    try {
      const value = await options.getMetadata?.(contentId);
      return value == null ? error('not_found', 404) : json({ data: publicFields(value, contentId) });
    } catch {
      return error('unavailable', 503);
    }
  }

  async function handle(request: Request): Promise<Response> {
    let path: string;
    try { path = new URL(request.url).pathname; } catch { return error('invalid_request', 400); }
    const match = /^\/v1\/content\/([^/]+)(\/access)?$/.exec(path);
    if (!match) return error('not_found', 404);
    let id: string;
    try { id = decodeURIComponent(match[1]!); } catch { return error('invalid_request', 400); }
    if (match[2]) return access(request, id);
    if (request.method !== 'GET') return error('method_not_allowed', 405, { Allow: 'GET' });
    return metadata(id);
  }

  return { access, metadata, handle };
}
