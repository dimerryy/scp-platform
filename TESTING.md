# Testing Guide

This document provides an overview of the testing setup for the SCP Platform.

## Overview

The project has three main components, each with its own testing setup:

1. **Backend (Python/FastAPI)**: Uses `pytest` with `pytest-asyncio` and `httpx`
2. **Web (React/TypeScript)**: Uses `Vitest` with `React Testing Library`
3. **Mobile (React Native/Expo)**: Uses `Jest` with `React Native Testing Library`

## Backend Tests

### Setup

```bash
cd backend/backend
pip install -r requirements-test.txt
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

### Test Files

- `tests/test_auth.py`: Authentication endpoints
- `tests/test_suppliers.py`: Supplier management
- `tests/test_products.py`: Product catalog
- `tests/test_orders.py`: Order management

### Key Features

- Uses in-memory SQLite database for fast tests
- Automatic database cleanup between tests
- Fixtures for common test data (users, suppliers, etc.)
- Authentication helpers for protected endpoints

## Web Tests

### Setup

```bash
cd backend/web
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With UI
npm run test:ui

# Coverage
npm run test:coverage
```

### Test Files

- `src/test/__tests__/AuthContext.test.tsx`: Authentication context
- `src/test/__tests__/api.client.test.ts`: API client configuration
- `src/test/__tests__/Login.test.tsx`: Login page component

### Key Features

- Uses Vitest (fast, Vite-native)
- jsdom environment for DOM testing
- React Testing Library for component tests
- Mocked API calls

## Mobile Tests

### Setup

```bash
cd backend/mobile
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Files

- `src/test/__tests__/roleHelpers.test.ts`: Role helper functions
- `src/test/__tests__/authStorage.test.ts`: AsyncStorage utilities

### Key Features

- Uses Jest with Expo preset
- React Native Testing Library
- Mocked AsyncStorage
- Mocked Expo modules

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Test Names**: Use descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear sections
4. **Mock External Dependencies**: Mock API calls, storage, and external services
5. **Test Edge Cases**: Test both success and failure scenarios
6. **Keep Tests Fast**: Use in-memory databases and mocked dependencies

## Coverage Goals

- **Backend**: Aim for >80% code coverage
- **Web**: Aim for >70% code coverage (focus on critical paths)
- **Mobile**: Aim for >70% code coverage (focus on business logic)

## Continuous Integration

Tests should be run automatically in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Backend Tests
  run: |
    cd backend/backend
    pytest --cov=app --cov-report=xml

- name: Run Web Tests
  run: |
    cd backend/web
    npm test -- --coverage

- name: Run Mobile Tests
  run: |
    cd backend/mobile
    npm test -- --coverage
```

## Troubleshooting

### Backend Tests

- **Database errors**: Ensure test database is properly isolated
- **Import errors**: Check that all models are imported in `conftest.py`

### Web Tests

- **Module not found**: Check `vite.config.ts` paths
- **DOM errors**: Ensure `jsdom` is properly configured

### Mobile Tests

- **AsyncStorage errors**: Check that mocks are set up in `setup.ts`
- **Expo module errors**: Ensure `jest-expo` preset is configured

