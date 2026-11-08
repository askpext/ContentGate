import 'server-only';

// Mock private CMS. Never import this module in a public catalog or client component.
const bodies: Record<string, string[]> = {
  'the-public-boundary': [
    'The private edition begins here. CONTENTGATE_PRIVATE_BOUNDARY_7F3A',
    'The critical moment in a publishing system is not when a subscription prompt appears. It is when the server decides whether the article should leave its storage at all. Once text reaches a browser, presentation rules cannot take it back.',
    'A useful boundary asks three questions in order: who is making this request, may that person read this article, and where should the article be retrieved? The last question must wait for the first two answers.',
    'Keeping these responsibilities separate lets a publisher change its subscription provider without rebuilding its newsroom tools. The authorization layer stays small because the publisher already owns the policy.',
  ],
  'a-smaller-stack': [
    'The private edition begins here. CONTENTGATE_PRIVATE_STACK_9B2C',
    'Every additional system asks a newsroom to maintain another model of its readers. A smaller stack keeps identity with the identity provider and billing with the subscription provider.',
    'Content delivery only needs a verified principal, a permission decision, and a private source. That simplicity makes the boundary easier to test, but it does not remove the need to close old CMS routes and configure shared caches carefully.',
  ],
};

export async function getPrivateArticle(id: string) {
  return Object.hasOwn(bodies, id) ? { id, paragraphs: bodies[id]! } : null;
}
