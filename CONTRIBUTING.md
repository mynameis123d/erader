# Contributing Guide

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run tests: `npm test`

## Project Structure

```
src/
├── types/              # TypeScript type definitions
├── state/              # Zustand stores
│   ├── library-store.ts   # Library management
│   ├── reader-store.ts    # Reading session management
│   ├── settings-store.ts  # App settings
│   └── store-utils.ts     # Shared utilities
├── services/           # Services layer
│   └── indexed-storage-service.ts  # IndexedDB abstraction
├── hooks/              # Convenience hooks
│   ├── useLibrary.ts
│   ├── useReader.ts
│   ├── useSettings.ts
│   └── index.ts
├── init.ts             # Store initialization
└── index.ts            # Main entry point
```

## Development Workflow

### Making Changes

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Run tests: `npm test`
5. Check types: `npm run typecheck`
6. Lint code: `npm run lint`
7. Build: `npm run build`

### Adding New Store Features

When adding new features to stores:

1. Add types to `src/types/index.ts`
2. Update the store interface with new state/actions
3. Implement the action in the store
4. Add persistence if needed (update `partialize`)
5. Add hooks in corresponding hook file
6. Write tests
7. Update documentation

### Testing

- Unit tests go in `tests/` directory
- Name test files with `.test.ts` suffix
- Use Vitest for testing
- Aim for good coverage of state changes

Example test:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useLibraryStore } from '../src/state/library-store';

describe('MyFeature', () => {
  beforeEach(() => {
    useLibraryStore.getState().clearLibrary();
  });

  it('should do something', () => {
    // Test implementation
  });
});
```

## Code Style

- Use TypeScript for all code
- Follow existing code conventions
- Use meaningful variable names
- Add JSDoc comments for complex functions
- Keep functions small and focused

## TypeScript Guidelines

- Use explicit types for function parameters
- Avoid `any` where possible
- Define interfaces for complex types
- Use type guards when needed
- Leverage TypeScript's inference when obvious

## Persistence Guidelines

When modifying persistence:

- Update `partialize` to include new persisted state
- Add serialization/deserialization for Dates
- Test rehydration behavior
- Handle migration if changing structure

## Pull Request Process

1. Update documentation if adding features
2. Add tests for new functionality
3. Ensure all tests pass
4. Update ARCHITECTURE.md if changing architecture
5. Update EXAMPLES.md with usage examples

## Common Tasks

### Adding a New Type

1. Add to `src/types/index.ts`
2. Export from the file
3. Use in stores/hooks as needed

### Adding a New Hook

1. Create in appropriate hook file
2. Export from `src/hooks/index.ts`
3. Add documentation with example
4. Write tests if complex

### Modifying Store Structure

1. Update interface
2. Update initialState
3. Update persistence (partialize, onRehydrate)
4. Migrate existing persisted data if needed
5. Update tests

## Questions?

Open an issue for discussion if you're unsure about anything!
