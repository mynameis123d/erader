import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';

export function Library() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Your Library</h1>
        <p className="text-muted">Manage and explore your ebook collection</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Panel elevation="soft">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent-soft)' }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: 'var(--color-accent)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted">Total Books</p>
              <p className="text-2xl font-semibold">0</p>
            </div>
          </div>
        </Panel>

        <Panel elevation="soft">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent-soft)' }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: 'var(--color-accent)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted">Currently Reading</p>
              <p className="text-2xl font-semibold">0</p>
            </div>
          </div>
        </Panel>

        <Panel elevation="soft">
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-accent-soft)' }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: 'var(--color-accent)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted">Favorites</p>
              <p className="text-2xl font-semibold">0</p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel elevation="none">
        <div className="text-center py-16">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-accent-soft)' }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: 'var(--color-accent)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No books yet</h3>
          <p className="text-muted mb-6">
            Start building your digital library by adding your first ebook
          </p>
          <Button variant="primary">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Book
          </Button>
        </div>
      </Panel>
    </div>
  );
}
