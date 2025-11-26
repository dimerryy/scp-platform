"""
Tests for product endpoints
"""
import pytest
from fastapi import status
from decimal import Decimal


@pytest.fixture
def test_supplier(client, auth_headers):
    """Create a test supplier"""
    response = client.post(
        "/suppliers",
        json={"name": "Test Supplier"},
        headers=auth_headers,
    )
    return response.json()


def test_create_product(client, auth_headers, test_supplier):
    """Test creating a product"""
    supplier_id = test_supplier["id"]
    response = client.post(
        f"/suppliers/{supplier_id}/products",
        json={
            "name": "Test Product",
            "description": "A test product",
            "unit": "kg",
            "price": "10.50",
            "stock": 100,
            "min_order_quantity": 1,
            "delivery_available": True,
            "pickup_available": True,
            "lead_time_days": 3,
        },
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Test Product"
    assert data["supplier_id"] == supplier_id
    assert data["delivery_available"] is True
    assert data["lead_time_days"] == 3


def test_list_products(client, auth_headers, test_supplier):
    """Test listing products"""
    supplier_id = test_supplier["id"]
    
    # Create a product first
    client.post(
        f"/suppliers/{supplier_id}/products",
        json={
            "name": "Test Product",
            "unit": "kg",
            "price": "10.50",
        },
        headers=auth_headers,
    )
    
    # List products
    response = client.get(f"/products?supplier_id={supplier_id}", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_update_product(client, auth_headers, test_supplier):
    """Test updating a product"""
    supplier_id = test_supplier["id"]
    
    # Create product
    create_response = client.post(
        f"/suppliers/{supplier_id}/products",
        json={
            "name": "Original Name",
            "unit": "kg",
            "price": "10.50",
        },
        headers=auth_headers,
    )
    product_id = create_response.json()["id"]
    
    # Update product
    response = client.put(
        f"/suppliers/{supplier_id}/products/{product_id}",
        json={
            "name": "Updated Name",
            "unit": "kg",
            "price": "15.00",
        },
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["price"] == "15.00"

