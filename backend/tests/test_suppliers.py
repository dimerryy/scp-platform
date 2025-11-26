"""
Tests for supplier endpoints
"""
import pytest
from fastapi import status


def test_create_supplier(client, auth_headers):
    """Test creating a supplier"""
    response = client.post(
        "/suppliers",
        json={"name": "Test Supplier", "description": "A test supplier"},
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Test Supplier"
    assert "id" in data


def test_create_supplier_unauthorized(client):
    """Test creating supplier without authentication"""
    response = client.post(
        "/suppliers",
        json={"name": "Test Supplier"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_my_suppliers(client, auth_headers):
    """Test listing user's suppliers"""
    # First create a supplier
    client.post(
        "/suppliers",
        json={"name": "My Supplier"},
        headers=auth_headers,
    )
    
    # Then list them
    response = client.get("/suppliers/my", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_list_all_suppliers(client):
    """Test listing all suppliers (public endpoint)"""
    response = client.get("/suppliers")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)

