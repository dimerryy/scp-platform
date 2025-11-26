from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal

from ..database import get_db
from ..models import User, Supplier, Product
from ..schemas import ProductCreate, ProductResponse, ProductBase
from ..deps import get_current_user, require_supplier_owner_or_manager

router = APIRouter(tags=["products"])


@router.get("/products", response_model=List[ProductResponse])
def list_products(
    supplier_id: Optional[int] = Query(None, description="Filter by supplier ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List products, optionally filtered by supplier_id"""
    query = db.query(Product)
    
    if supplier_id:
        # Verify supplier exists
        supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if not supplier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found"
            )
        query = query.filter(Product.supplier_id == supplier_id)
    
    # Only show active products by default
    query = query.filter(Product.is_active == True)
    
    products = query.all()
    return products


@router.post("/suppliers/{supplier_id}/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    supplier_id: int,
    product_data: ProductBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product (supplier Owner or Manager only)"""
    # Check if user has permission (OWNER or MANAGER)
    require_supplier_owner_or_manager(supplier_id, current_user, db)
    
    # Verify supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Create product
    db_product = Product(
        supplier_id=supplier_id,
        **product_data.model_dump()
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    return db_product


@router.put("/suppliers/{supplier_id}/products/{product_id}", response_model=ProductResponse)
def update_product(
    supplier_id: int,
    product_id: int,
    product_data: ProductBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a product (supplier Owner or Manager only)"""
    # Check if user has permission (OWNER or MANAGER)
    require_supplier_owner_or_manager(supplier_id, current_user, db)
    
    # Get product and verify it belongs to the supplier
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.supplier_id == supplier_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update product fields
    for field, value in product_data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    
    return product


@router.delete("/suppliers/{supplier_id}/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    supplier_id: int,
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a product (supplier Owner or Manager only)"""
    # Check if user has permission (OWNER or MANAGER)
    require_supplier_owner_or_manager(supplier_id, current_user, db)
    
    # Get product and verify it belongs to the supplier
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.supplier_id == supplier_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Soft delete by setting is_active to False
    product.is_active = False
    db.commit()
    
    return None
