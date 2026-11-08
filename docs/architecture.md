# Architecture

ContentGate is a server library with an HTTP contract, not a new publishing
platform. It has three inputs: a verified identity provider, a permission provider,
and a private content loader. Public metadata is a separate optional loader.

## Execution order

1. Validate the content ID, request method, and absence of a request body.
2. Call `authenticate(request)`; null/undefined means 401.
3. Call `authorize({ user, contentId })`; only literal `true` permits delivery.
4. Call `getContent(contentId)`; null/undefined means 404.
5. Serialize `{ data: content }` with no-store headers.

All provider and serialization exceptions produce an opaque 503. Denial never
queries the protected source, even to check whether an article exists. With
`hideDenied: true`, an authenticated denial uses the same 404 error as a missing
resource. Timing is not padded; intentionally published metadata already discloses
that article's existence.

`gate.handle(request)` recognizes the two documented absolute URL paths.
`gate.access(request, contentId)` offers the identical pipeline when your framework
has already routed an ID (including server rendering); it still requires POST and
an empty body. `gate.metadata(contentId)` returns public fields only. These methods
always return a standard `Response`. There is no secondary unguarded read API.

## Data ownership

The publisher stores the body privately and maintains an explicitly public
catalog. ContentGate copies metadata fields rather than serializing an arbitrary
CMS object. This prevents accidental extra-field exposure, but a publisher can
still incorrectly put private text in a public `description`: editorial review
and source separation remain essential.

Protected content may be any JSON-serializable payload (not a stream or Response).
Use null for missing content. Core code does not sanitize article HTML: render
untrusted text safely or sanitize rich content at your own rendering boundary.
The demo renders escaped text paragraphs.

## Deliberate limits

- No cache or shared mutable request state. Each request rechecks permission.
- No account, payment, CMS, or database dependency.
- No token minting or universal session format. Different publishers have
  different authentication requirements.
- No plugin registry or automatic CMS hardening. Existing bypass routes need
  publisher-specific changes.
- No authorization retries: provider failures deny delivery. Set bounded network
  timeouts inside providers and enforce request deadlines at the host.
- No streaming bodies. A small JSON response keeps failure handling and the
  authorization boundary understandable. Enforce size limits at the host/source.

The SDK is ESM TypeScript compiled to JavaScript with type declarations. The core
requires native Fetch APIs and no Node-specific modules. The reference demo uses
Node for its mock token comparison; other runtimes may supply their own providers.
The npm engine range describes the supported development/runtime baseline, not a
framework requirement.
