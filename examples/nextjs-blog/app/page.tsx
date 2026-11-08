import { articles } from '../lib/catalog';

export default function Home() {
  return <>
    <section className="intro"><p className="eyebrow">Field notes · November 2026</p>
      <h1>Good stories deserve<br /><em>a clear boundary.</em></h1>
      <p className="dek">A small journal about publishing, ownership, and the systems in between. Read the context freely. The full story stays with its readers.</p>
    </section>
    <div className="section-label"><span>The latest edition</span><span>02 stories</span></div>
    <section className="stories" aria-label="Latest articles">{articles.map((article, i) => <article className="card" key={article.id}>
      <a href={`/articles/${article.id}`} className={`cover cover-${i}`}><img src={article.image} alt="Abstract editorial illustration of a boundary" /><span>Essay / 0{i + 1}</span></a>
      <p className="eyebrow">Architecture · Subscriber edition</p>
      <h2><a href={`/articles/${article.id}`}>{article.title}</a></h2>
      <p>{article.description}</p><div className="byline">{article.author}<span>{article.publishedAt.slice(0, 10)}</span></div>
    </article>)}</section>
    <aside className="note"><span className="dot" /><p><strong>A working security boundary.</strong> These pages contain public editorial metadata. Article bodies are retrieved on the server only after an access decision. See the repository README to try a subscriber request.</p></aside>
  </>;
}
