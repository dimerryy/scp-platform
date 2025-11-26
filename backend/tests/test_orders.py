"""
Tests for order endpoints
"""
import pytest
from fastapi import status


@pytest.fixture
def test_supplier_and_consumer(client, auth_headers, db):
    """Create a supplier and consumer with accepted link"""
    from app.models import Supplier, Consumer, Link, LinkStatus, SupplierUser, SupplierRole, User, Product
    from app.routers.auth import get_password_hash
    
    # Create supplier
    supplier_response = client.post(
        "/suppliers",
        json={"name": "Test Supplier"},
        headers=auth_headers,
    )
    supplier_id = supplier_response.json()["id"]
    
    # Create consumer user
    consumer_user = User(
        email="consumer@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Consumer User",
        is_active=True,
    )
    db.add(consumer_user)
    db.flush()
    
    # Create consumer
    consumer = Consumer(
        user_id=consumer_user.id,
        organization_name="Test Consumer Org",
        is_active=True,
    )
    db.add(consumer)
    db.flush()
    
    # Create link
    link = Link(
        supplier_id=supplier_id,
        consumer_id=consumer.id,
        status=LinkStatus.ACCEPTED,
        requested_by=consumer_user.id,
    )
    db.add(link)
    
    # Create product
    product = Product(
        supplier_id=supplier_id,
        name="Test Product",
        unit="kg",
        price=10.50,
        stock=100,
        min_order_quantity=1,
        is_active=True,
    )
    db.add(product)
    db.commit()
    
    return {
        "supplier_id": supplier_id,
        "consumer_id": consumer.id,
        "consumer_user_id": consumer_user.id,
        "product_id": product.id,
    }


def test_create_order(client, test_supplier_and_consumer, db):
    """Test creating an order"""
    from app.routers.auth import create_access_token
    from app.models import User
    
    consumer_user_id = test_supplier_and_consumer["consumer_user_id"]
    consumer_user = db.query(User).filter(User.id == consumer_user_id).first()
    
    token = create_access_token(data={"sub": consumer_user.email})
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post(
        "/orders",
        json={
            "supplier_id": test_supplier_and_consumer["supplier_id"],
            "items": [
                {
                    "product_id": test_supplier_and_consumer["product_id"],
                    "quantity": 5,
                }
            ],
            "delivery_method": "delivery",
        },
        headers=headers,
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "id" in data
    assert data["delivery_method"] == "delivery"
    assert "estimated_delivery_date" in data
    assert len(data["items"]) == 1

