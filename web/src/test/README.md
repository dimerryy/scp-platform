# Web Tests

## Setup

Install dependencies:
```bash
cd backend/web
npm install
```

## Running Tests

Run all tests:
```bash
npm test
```

Run in watch mode:
```bash
npm run test:watch
```

Run with UI:
```bash
npm run test:ui
```

Run with coverage:
```bash
npm run test:coverage
```

## Test Structure

- `setup.ts`: Test configuration and global setup
- `__tests__/`: Test files
  - `AuthContext.test.tsx`: AuthContext tests
  - `api.client.test.ts`: API client tests
  - `Login.test.tsx`: Login page tests

## Writing New Tests

1. Create a new file `*.test.tsx` or `*.test.ts` in `src/test/__tests__/`
2. Import testing utilities from `@testing-library/react`
3. Use `render` for component tests
4. Use `renderHook` for hook tests

Example:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from '../../components/MyComponent'

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

