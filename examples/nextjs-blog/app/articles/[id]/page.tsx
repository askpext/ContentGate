import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { GateResponse } from 'contentgate';
import { articles } from '../../../lib/catalog';
import { gate } from '../../../lib/gate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const article = articles.find(item => item.id === id);
  if (!article) return {};
  return { title: article.title, description: article.description,
    alternates: { canonical: article.canonicalUrl },
    openGraph: { type: 'article', title: article.title, description: article.description,
      url: article.canonicalUrl, images: [new URL(article.image, article.canonicalUrl).href],
      authors: [article.author], publishedTime: article.publishedAt } };
}

export default async function Article({ params }: Props) {
  const { id } = await params;
  const article = articles.find(item => item.id === id);
  if (!article) notFound();
  // Use the same enforcement pipeline for server rendering and the HTTP route.
  const response = await gate.access(new Request('http://contentgate.internal/access', {
    method: 'POST', headers: await headers(),
  }), id);
  const result = await response.json() as GateResponse<{ id: string; paragraphs: string[] }>;
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: article.title,
    description: article.description, author: { '@type': 'Person', name: article.author },
    datePublished: article.publishedAt, image: new URL(article.image, article.canonicalUrl).href,
    mainEntityOfPage: article.canonicalUrl, isAccessibleForFree: false,
    hasPart: { '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.protected-article' },
  };
  return <article className="article">
    <a href="/" className="back">← All stories</a>
    <p className="eyebrow">Essay · Subscriber edition</p><h1>{article.title}</h1>
    <p className="dek">{article.description}</p>
    <div className="byline">By {article.author}<time dateTime={article.publishedAt}>{article.publishedAt.slice(0, 10)}</time></div>
    <img className="article-cover" src={article.image} alt="Abstract editorial illustration of a boundary" />
    <section className="protected-article" data-nosnippet>
      {'data' in result ? <div className="prose">{result.data.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
        : <div className="prompt"><p className="eyebrow">{response.status === 503 ? 'Temporarily unavailable' : 'The story continues'}</p>
          <h2>{response.status === 503 ? 'Please try again shortly.' : 'Reserved for subscribers.'}</h2>
          <p>{response.status === 503 ? 'We could not verify access right now.' : 'Your subscription supports independent writing. In a real publication, your existing subscription flow belongs here.'}</p>
          <div className="access-status">{response.status === 401 ? 'No verified session' : response.status === 403 ? 'This account does not have access' : 'Access unavailable'}<span>Body not delivered</span></div>
        </div>}
    </section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
  </article>;
}
