# Integration

These examples integrate the optional reference library. To implement native
protection without that dependency, start with [the ContentGate skill](../skills/contentgate/SKILL.md).

## Configure once, enforce on every request

Construct a server-only `gate` with `createContentGate`. Providers may call an
existing database, auth SDK, or API. `authenticate` resolves an object or null;
`authorize` resolves a boolean; `getContent` resolves JSON content or null. The
optional `getMetadata` returns the public string fields shown in the README.
Return an object or string from the content provider, not a native Response.

Mount the Web handler at:

```text
GET  /v1/content/:id
POST /v1/content/:id/access
```

The latter has no body. Query parameters are not authorization inputs to the
core. Your authentication provider receives the original request, so do not
introduce an insecure query-identity mechanism there. Unknown paths return 404;
wrong methods return 405 with Allow. Invalid IDs/body return 400. Error bodies
contain only a stable code. A missing metadata loader returns 404.

For a mount prefix or a framework with parsed route parameters, use
`gate.access(request, id)` and `gate.metadata(id)` in your own routes. Preserve
response status and headers. Do not create a parallel content loader endpoint.

## Next.js

See the runnable `examples/nextjs-blog` and the thin route in `adapters/nextjs`.
The handler uses native [Next.js route Request/Response support](https://nextjs.org/docs/app/api-reference/file-conventions/route).
Import the configured gate and private CMS module only from server components or
route handlers; add `import 'server-only'` to those modules.

For article SSR, forward the incoming verified credential headers into an internal
POST Request and call `gate.access`. Render the returned content only on success.
Render the public synopsis and a prompt for denied readers. Do not pass a private
body to a client component before permission is known. Keep the article dynamic
and its outgoing response private/no-store. Do not preload bodies in metadata
generation, layouts, public lists, static generation, or search indexes.

The example has no external font/image requirement and no client-side enforcement.
Change its canonical URLs from localhost and replace the mock providers before
using it on a publisher's host. A prompt alone is not proof of denial; inspect the
entire HTTP response and public build output, as the verifier does.

## Astro

Copy `adapters/astro/content.ts` into `src/pages/v1/content/[...path].ts` and fix
the configured-gate import. Install your deployment's Astro server adapter and use
SSR; the example sets `prerender = false`. For an article page, perform the same
server-side `gate.access` call, set response no-store headers, and render only its
successful data. Never import private bodies into a prerendered content collection,
client island, public feed, or search index. The adapter file is a template; this
repository does not install or build a separate Astro application.

## WordPress

`adapters/wordpress/contentgate.php` is an illustrative HTTP client for a WordPress
template/backend, **not an installable protection plugin**. Define a fixed HTTPS
`CONTENTGATE_ORIGIN` in server configuration. Obtain a short-lived credential for
the current authenticated reader through your existing auth system. The service
must validate it and evaluate that reader's entitlement. Never substitute a
service-wide admin token, numeric WordPress user ID, or client-supplied role.

Call `contentgate_fetch_article($id, $verified_user_token)` before output begins,
handle `WP_Error` as denial, and render authorized data using `esc_html` for text
or an appropriate rich-content sanitizer. Do not cache the result globally.
Configure all personalized page responses as no-store, including denied ones,
and exclude them from WordPress/CDN page caching before PHP runs.

The viable small integration is to store only approved metadata in public posts
and retrieve the private body externally. If bodies already live in `post_content`,
a site-specific protection plugin/storage migration is required: it must cover
REST, revisions, feeds, search/excerpts, GraphQL, embeds, AMP, previews, exports,
uploads and caches. This MVP does not claim to protect that configuration. The
PHP snippet has no WordPress runtime test in this repository.

## HTTP from another language

Any backend can call the same endpoint; there is no JavaScript client protocol.
Example using Python's standard library:

```python
import json
import urllib.request

# Token obtained from your existing auth system for this verified reader.
request = urllib.request.Request(
    "https://publisher.example/v1/content/story-42/access",
    method="POST",
    headers={"Authorization": "Bearer " + verified_reader_token},
)
with urllib.request.urlopen(request, timeout=5) as response:
    article = json.load(response)["data"]
```

Treat 401/403/404 as absence of permitted content and 503/timeouts as temporary
failure. Do not fall back to a public CMS body on failure. Set no-store on your
own rendered page. Service-to-service transport authentication may additionally
protect the endpoint, but it must not replace the individual reader's permission
decision. Deploy behind TLS using your existing web host; the Next.js example is
one self-hostable reference host rather than a required framework.

## SEO and previews

Keep titles, editorial descriptions, author/date, canonical URL, and image in a
public catalog. A permitted excerpt is an explicit editorial release of that
text, not a hidden copy of the article. Core metadata projection strips unknown
fields, but cannot determine whether a description itself contains private text.

The demo emits Open Graph metadata and `NewsArticle` JSON-LD using
`isAccessibleForFree: false` and a class selector identifying the protected section.
Follow [Google's paywall structured data documentation](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content)
and validate your published markup. There is no user-agent authorization branch.
Without publisher-authorized crawler access, only the public representation is
available for indexing; structured data does not make the full article crawlable.
Do not deliver a different article to a claimed Googlebot for ranking advantage.
Any crawler permission must be explicit, verifiable, and consistent across views.
