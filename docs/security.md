# Security boundaries and deployment responsibilities

## Trust model

The visitor controls URLs, headers, cookies, body data, user agents, and frontend
code. None of those is an identity until the publisher's `authenticate` callback
validates a session or credential. For signed tokens, validate the signature,
allowed algorithm, issuer, audience, expiry, and relevant revocation policy using
your existing auth library. Do not use an unverified JWT payload or `X-User-Id`.

The publisher's providers and content source are trusted server code. Authorization
must evaluate the current user's entitlement for the specific content ID and
tenant/site where applicable. Returning true for a site-wide service credential
does not establish a reader's subscription. Multi-site ID scoping belongs in the
provider. Only the boolean `true` grants access; failure or false never calls the
content loader. Core responses never include provider exception text.

The three mock tokens in the demo are local fixtures. They are disabled when
unset/short, have no user-managed lifecycle, and are not production authentication.
Use real session cookies with HttpOnly, Secure, SameSite, expiration, and logout
handling. TLS is required outside localhost. Do not put tokens in query strings.

## Caches and secondary delivery paths

Every core response uses `Cache-Control: private, no-store`,
`CDN-Cache-Control: no-store`, and `Vary: Authorization, Cookie`. No public cache
opt-in exists in the MVP. If deliberately caching metadata, first ensure it is
identical for every reader and contains only approved public fields.

Preserve no-store on the *rendered HTML and RSC response* as well as the API. A
protected fetch alone cannot stop a host framework from caching the resulting
page. Next.js article routes are dynamic; no private data uses `use cache`,
`unstable_cache`, cached `fetch`, or static export. Use `cache: 'no-store'` when
your provider calls a remote CMS. Disable CDN cache-everything rules, page-cache
plugins, service-worker storage, and shared fragment caches on protected routes.
Do not rely on a cookie cache key as the sole boundary. Verify subscriber →
anonymous and anonymous → subscriber sequences on your actual deployment.

Audit these publisher-controlled paths before release:

| Integration | Alternate paths to close |
| --- | --- |
| Next.js | Public CMS URLs, static props/export, RSC/prefetch, API routes, build assets/maps, metadata generators, image/media origins |
| Astro | Prerendered pages, content collections bundled into public assets, endpoints, feeds, search indexes, hydrated props, CMS/media origin |
| WordPress | `post_content`, REST posts/revisions/autosaves, feeds, excerpts/search, embeds/oEmbed, GraphQL plugins, AMP/print views, XML-RPC, page caches, exports/backups, uploads |
| All | Source storage ACLs, public object buckets, preview links, alternate hostnames, mobile APIs, downloadable copies |

Removing content from the HTML template alone does not secure these paths. Prefer
storing public WordPress posts with only editorial metadata, and keeping the body
in a private external source. Moving previously public content also requires
purging old caches and acknowledging previously downloaded copies.

## Host controls

ContentGate adds no CORS permissions. Keep requests same-origin unless you have
an explicit trusted-origin policy; never combine credentialed access with broad
origin reflection. The access operation is read-only, with no request body. It is
not a CSRF defense for login, billing, or any state-changing publisher operation.
Handle those independently. Do not add JSONP or permissive CORS to protected data.

Use request/body/response size limits, rate limits, and deadlines at your HTTP
host. Validate any custom routing before passing an ID to a provider; do not
concatenate it into SQL. The default ID grammar blocks path separators and
control characters. This is input validation, not a replacement for parameterized
queries or correctly scoped CMS queries.

Keep secrets and raw bodies out of logs, telemetry, browser bundles, error pages,
and source maps. The core performs no logging. If adding observability, log
sanitized outcome codes and request IDs; never Authorization/Cookie values or
provider error objects by default. Restrict access to server build artifacts.

Authorized readers can copy content they receive. This tool provides access
control at delivery time, not DRM, scraping prevention, or post-delivery revocation.

## Evidence and limits

Core tests assert exact provider call order, including zero content retrieval on
denial, forged identity handling, expired entitlement, malformed IDs/body,
provider exceptions, serialization failure, and concurrent requests. The cache
test models a shared cache obeying HTTP directives; it cannot validate a CDN that
overrides them.

`npm run test:demo` checks a production Next.js server, anonymous and authorized
HTML without a JavaScript engine, RSC responses, direct API access, request
headers, bot parity, public static assets, and absence of test tokens in logs.
This is a bounded local regression suite, not a claim of a comprehensive audit.
