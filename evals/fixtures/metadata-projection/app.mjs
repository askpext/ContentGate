import { authenticate, authorize, getContent } from './providers.mjs';

const headers = { 'Cache-Control': 'private, no-store' };
export function reset() {}

export async function handle(request) {
  const match = /^\/(api|metadata)\/([A-Za-z0-9_-]{1,128})$/.exec(new URL(request.url).pathname);
  if (!match) return Response.json({ error: 'invalid_request' }, { status: 400, headers });
  const [, route, id] = match;
  try {
    if (route === 'metadata') {
      const article = await getContent(id);
      return Response.json({ data: { ...article, description: 'A genuine public synopsis.' } }, { headers });
    }
    const user = await authenticate(request);
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401, headers });
    if (!await authorize({ user, contentId: id })) return Response.json({ error: 'forbidden' }, { status: 403, headers });
    const article = await getContent(id);
    if (!article) return Response.json({ error: 'not_found' }, { status: 404, headers });
    return Response.json({ data: article }, { headers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 503, headers });
  }
}
