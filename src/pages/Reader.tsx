import { useParams, Link } from 'react-router-dom';
import { SplitPane } from '@/components/ui/SplitPane';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';

export function Reader() {
  const { bookId } = useParams<{ bookId: string }>();

  return (
    <div className="h-screen flex flex-col bg-[var(--color-background)]">
      <div className="flex items-center justify-between px-6" style={{ height: 'var(--topbar-height)' }}>
        <div>
          <p className="text-sm text-muted">Reading</p>
          <h1 className="text-2xl font-semibold">Book #{bookId ?? '0000'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/library">
            <Button variant="ghost">Back to Library</Button>
          </Link>
          <Button>Open Settings</Button>
        </div>
      </div>

      <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <SplitPane
          defaultLeftWidth={360}
          left={
            <div className="h-full p-6 space-y-6">
              <Panel elevation="none" padded>
                <h2 className="text-lg font-semibold mb-3">Table of Contents</h2>
                <ol className="space-y-2 text-sm text-muted">
                  <li>Chapter 1 — The Beginning</li>
                  <li>Chapter 2 — A New Adventure</li>
                  <li>Chapter 3 — Turning Point</li>
                  <li>Chapter 4 — Resolution</li>
                </ol>
              </Panel>

              <Panel elevation="none" padded>
                <h2 className="text-lg font-semibold mb-3">Notes & Highlights</h2>
                <p className="text-muted text-sm">
                  Highlights you create will appear here for quick reference.
                </p>
              </Panel>
            </div>
          }
          right={
            <div className="min-h-full p-12 max-w-4xl mx-auto">
              <article
                className="prose lg:prose-lg text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-serif)', maxWidth: 'var(--reading-max-width)' }}
              >
                <h2>Welcome to the Reader</h2>
                <p>
                  This is a live preview of the upcoming immersive reading experience. Typography, spacing,
                  and theme adjustments will reflect your preferences here.
                </p>
                <p>
                  Use this space to preview how content will appear, including chapter titles, paragraph flow,
                  footnotes, and interactive widgets. The reader will support multiple themes, custom fonts,
                  and advanced pagination features.
                </p>
                <blockquote>
                  “Reading is essential for those who seek to rise above the ordinary.” – Jim Rohn
                </blockquote>
                <p>
                  Navigate between chapters, view your highlights, and track reading progress seamlessly. The
                  layout adapts to your device, ensuring a comfortable reading experience whether you prefer a
                  compact or spacious view.
                </p>
              </article>
            </div>
          }
        />
      </div>
    </div>
  );
}
