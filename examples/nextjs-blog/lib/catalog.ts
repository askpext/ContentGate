import type { PublicMetadata } from 'contentgate';

// Intentionally public. This catalog never contains an article body.
export const articles: PublicMetadata[] = [
  {
    id: 'the-public-boundary', title: 'Where a story becomes private',
    description: 'A browser can only keep a secret it never receives. We examine what that means for independent publishers and the architecture behind a subscription.',
    author: 'Maya Chen', publishedAt: '2026-11-08T09:00:00+05:30',
    image: '/boundary.svg', canonicalUrl: 'http://localhost:3000/articles/the-public-boundary',
  },
  {
    id: 'a-smaller-stack', title: 'The case for a smaller publishing stack',
    description: 'An editorial look at keeping identity, subscriptions, and content storage independent—and connecting them at one carefully defined boundary.',
    author: 'Arun Rao', publishedAt: '2026-11-07T09:00:00+05:30',
    image: '/boundary.svg', canonicalUrl: 'http://localhost:3000/articles/a-smaller-stack',
  },
];
