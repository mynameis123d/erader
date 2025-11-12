# EReader - Modern Web Ebook Reader

A modern, full-featured web-based ebook reader built with React 19, TypeScript, Vite, and Tailwind CSS. Features a beautiful Notion/Apple-inspired design with comprehensive state management for library organization, reading sessions, and customizable themes.

## Features

### 🎨 Modern UI
- Clean, minimal interface with Notion/Apple-inspired design tokens
- Dark, light, and sepia themes with instant switching
- Responsive layout with sidebar navigation and topbar
- Smooth animations and transitions
- Custom scrollbars and focus states

### 📚 Library Management
- Organize your ebook collection
- Collections and favorites
- Book metadata tracking
- Activity history
- Search and filtering (coming soon)

### 📖 Reading Experience
- Immersive full-screen reader
- Split-pane layout with table of contents
- Highlights and bookmarks
- Reading progress tracking
- Customizable typography and spacing

### ⚙️ Settings & Customization
- Multiple theme modes (light, dark, sepia)
- Density options (compact, standard, cozy)
- Reading preferences
- Data export/import
- Persistent settings across sessions

### 🔧 Technical Features
- **Type-safe** with TypeScript
- **Fast** with Vite dev server and HMR
- **State management** using Zustand
- **Persistent storage** with IndexedDB for book binaries
- **Responsive design** with Tailwind CSS
- **Path aliases** for clean imports
- **Comprehensive testing** with Vitest

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern browser with ES2022 support

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (opens at http://localhost:3000)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── ui/           # Base components (Button, Panel, etc.)
│   └── index.ts
├── features/         # Feature-specific components
├── hooks/            # Custom React hooks
├── layouts/          # Layout components (RootLayout)
├── lib/              # Utility functions
├── pages/            # Route pages (Library, Reader, Settings)
├── services/         # API and storage services
├── state/            # Zustand stores
│   ├── library-store.ts
│   ├── reader-store.ts
│   ├── settings-store.ts
│   └── themeStore.ts
├── styles/           # Global styles and tokens
│   ├── globals.css
│   └── tokens.css
├── types/            # TypeScript type definitions
├── App.tsx           # App router configuration
└── main.tsx          # Application entry point
```

## Architecture

### State Management

The application uses Zustand for state management with three main stores:

#### Library Store
Manages your ebook collection including:
- Books and metadata
- Collections/playlists
- Activity history
- Sync with IndexedDB storage

#### Reader Store
Tracks the active reading session:
- Current book and location
- Reading progress
- Highlights and bookmarks
- Session history

#### Settings Store
Manages application preferences:
- Theme settings (light/dark/sepia/custom)
- Typography preferences
- Translation settings
- Auto-save and analytics toggles

#### Theme Store
Handles UI theming:
- Theme mode (light/dark/sepia)
- Density settings
- Persistent preferences

### Routing

React Router v6 with the following routes:
- `/` - Redirects to library
- `/library` - Main library view with book grid
- `/reader/:bookId` - Immersive reading view
- `/settings` - Settings and preferences

### Styling

Uses Tailwind CSS with custom design tokens:

#### Color Palette
- **Brand colors**: Sky blue accent palette
- **Neutral colors**: Comprehensive gray scale
- **Sepia colors**: Warm reading theme

#### Design Tokens (CSS Variables)
- `--color-background`, `--color-surface`, `--color-text`
- `--color-accent`, `--color-border`
- `--radius-*` for border radius
- `--shadow-*` for elevation
- `--transition-*` for animations
- Layout dimensions (`--sidebar-width`, `--topbar-height`)

Themes automatically adjust all tokens for consistent styling.

### Components

#### Base UI Components
- **Button**: Primary, secondary, outline, and ghost variants
- **IconButton**: Compact icon-only actions
- **Panel**: Elevated cards with configurable shadows
- **SplitPane**: Resizable two-column layout

All components are fully typed and use CSS variables for theming.

## Usage Examples

### Using the Theme System

```typescript
import { useThemeStore } from '@/state/themeStore';

function MyComponent() {
  const { theme, setTheme, toggleTheme } = useThemeStore();
  
  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
}
```

### Using Library State

```typescript
import { useLibraryActions } from '@/hooks';

const { addBook } = useLibraryActions();

await addBook(bookFile, metadata);
```

### Path Aliases

Import from `@/` for clean imports:

```typescript
import { Button } from '@/components';
import { useThemeStore } from '@/state/themeStore';
import { cn } from '@/lib/utils';
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 15+
- Modern browsers with ES2022 support
- IndexedDB support (with graceful fallback)

## Development

### Tech Stack

- **React 19 RC** - Latest React features
- **TypeScript 5.3** - Type safety
- **Vite 5** - Fast build tool
- **Tailwind CSS 3.4** - Utility-first CSS
- **Zustand 4** - State management
- **React Router 6** - Client-side routing
- **Dexie** - IndexedDB wrapper
- **Vitest** - Unit testing

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Functional components with hooks
- CSS variables for theming
- Path aliases for clean imports

## Testing

The project includes comprehensive tests for:
- Store initialization and actions
- IndexedDB persistence
- Session tracking
- Highlights and bookmarks
- Settings management

Run tests with:

```bash
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT

---

Built with ❤️ using React, TypeScript, and Vite
