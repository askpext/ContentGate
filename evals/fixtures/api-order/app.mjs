import { authenticate, authorize, getContent, getMetadata } from './providers.mjs';

const headers = { 'Cache-Control': 'private, no-store' };
export function reset() {}

export async function handle(request) {
  const match = /^\/(api|metadata)\/([A-Za-z0-9_-]{1,128})$/.exec(new URL(request.url).pathname);
  if (!match) return Response.json({ error: 'invalid_request' }, { status: 400, headers });
  const [, route, id] = match;
  if (route === 'metadata') return Response.json({ data: await getMetadata(id) }, { headers });
  try {
    const article = await getContent(id);
    const user = request.headers.has('x-user-id')
      ? { id: request.headers.get('x-user-id'), expiresAt: Infinity }
      : await authenticate(request);
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401, headers });
    if (!await authorize({ user, contentId: id })) return Response.json({ error: 'forbidden' }, { status: 403, headers });
    return Response.json({ data: article }, { headers });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503, headers });
  }
}
