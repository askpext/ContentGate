import type { Metadata } from 'next';
import './style.css';

export const metadata: Metadata = {
  title: { default: 'The Boundary — ContentGate', template: '%s — The Boundary' },
  description: 'A small publication demonstrating server-side content authorization.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>
    <header className="masthead"><a href="/" className="brand">The Boundary<span> / a ContentGate publication</span></a>
      <span className="edition">Independent ideas. Deliberate access.</span></header>
    <main>{children}</main>
    <footer><span>ContentGate / reference edition</span><span>Public context. Protected stories.</span></footer>
  </body></html>;
}
