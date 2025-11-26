# Backend Tests

## Setup

Install test dependencies:

```bash
cd backend/backend
pip install -r requirements-test.txt
```

## Running Tests

Run all tests:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=app --cov-report=html
```

Run specific test file:
```bash
pytest tests/test_auth.py
```

Run specific test:
```bash
pytest tests/test_auth.py::test_login_success
```

## Test Structure

- `conftest.py`: Shared fixtures and test configuration
- `test_auth.py`: Authentication endpoint tests
- `test_suppliers.py`: Supplier endpoint tests
- `test_products.py`: Product endpoint tests
- `test_orders.py`: Order endpoint tests

## Writing New Tests

1. Create a new file `test_<module>.py` in the `tests/` directory
2. Import necessary fixtures from `conftest.py`
3. Use `client` fixture for API requests
4. Use `auth_headers` fixture for authenticated requests
5. Use `db` fixture for database operations

Example:
```python
def test_my_endpoint(client, auth_headers):
    response = client.get("/my-endpoint", headers=auth_headers)
    assert response.status_code == 200
```

