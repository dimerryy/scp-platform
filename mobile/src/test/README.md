# Mobile Tests

## Setup

Install dependencies:
```bash
cd backend/mobile
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

Run with coverage:
```bash
npm run test:coverage
```

## Test Structure

- `setup.ts`: Test configuration and mocks
- `__tests__/`: Test files
  - `roleHelpers.test.ts`: Role helper function tests
  - `authStorage.test.ts`: Auth storage utility tests

## Writing New Tests

1. Create a new file `*.test.ts` or `*.test.tsx` in `src/test/__tests__/`
2. Import testing utilities from `@testing-library/react-native`
3. Use `render` for component tests

Example:
```typescript
import { describe, it, expect } from '@jest/globals'
import { render } from '@testing-library/react-native'
import MyComponent from '../../components/MyComponent'

describe('MyComponent', () => {
  it('should render', () => {
    const { getByText } = render(<MyComponent />)
    expect(getByText('Hello')).toBeTruthy()
  })
})
```

