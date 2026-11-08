import { authenticate, authorize, getContent, getMetadata } from './providers.mjs';

const pages = new Map();
const privateHeaders = { 'Cache-Control': 'private, no-store' };
export function reset() { pages.clear(); }

export async function handle(request) {
  const match = /^\/(api|metadata|articles|cms)\/([A-Za-z0-9_-]{1,128})$/.exec(new URL(request.url).pathname);
  if (!match) return Response.json({ error: 'invalid_request' }, { status: 400, headers: privateHeaders });
  const [, route, id] = match;
  if (route === 'metadata') return Response.json({ data: await getMetadata(id) }, { headers: privateHeaders });
  if (route === 'cms') return Response.json({ data: await getContent(id) });
  if (route === 'articles' && pages.has(id)) return pages.get(id).clone();
  try {
    const user = await authenticate(request);
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401, headers: privateHeaders });
    if (!await authorize({ user, contentId: id })) return Response.json({ error: 'forbidden' }, { status: 403, headers: privateHeaders });
    const article = await getContent(id);
    if (!article) return Response.json({ error: 'not_found' }, { status: 404, headers: privateHeaders });
    if (route === 'articles') {
      const response = new Response(`<h1>${article.title}</h1><p>${article.body}</p>`, {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' },
      });
      pages.set(id, response.clone());
      return response;
    }
    return Response.json({ data: article }, { headers: privateHeaders });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503, headers: privateHeaders });
  }
}
