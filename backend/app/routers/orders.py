from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from decimal import Decimal
from datetime import datetime, timedelta

from ..database import get_db
from ..models import (
    User, Consumer, Supplier, Link, LinkStatus, Order, OrderItem, 
    Product, OrderStatus, SupplierUser, SupplierRole
)
from ..schemas import OrderCreate, OrderResponse, OrderItemResponse, OrderStatusUpdate
from ..deps import get_current_user, require_supplier_owner_or_manager, require_consumer_user

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order (CONSUMER only) - requires ACCEPTED link"""
    # Get consumer profile (this will raise 403 if not a consumer)
    _, consumer = require_consumer_user(current_user, db)
    
    # Verify supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == order_data.supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Validate that consumer has an ACCEPTED link with the supplier
    link = db.query(Link).filter(
        Link.supplier_id == order_data.supplier_id,
        Link.consumer_id == consumer.id,
        Link.status == LinkStatus.ACCEPTED
    ).first()
    
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must have an accepted link with this supplier to create an order"
        )
    
    # Validate items and calculate total
    total_amount = Decimal("0.00")
    order_items_data = []
    
    for item in order_data.items:
        # Get product
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.supplier_id == order_data.supplier_id,
            Product.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found or not available"
            )
        
        # Validate quantity
        if item.quantity < product.min_order_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantity for product {product.name} must be at least {product.min_order_quantity}"
            )
        
        if item.quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product {product.name}. Available: {product.stock}"
            )
        
        # Validate delivery method if specified
        if order_data.delivery_method:
            if order_data.delivery_method == "delivery" and not product.delivery_available:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {product.name} is not available for delivery"
                )
            if order_data.delivery_method == "pickup" and not product.pickup_available:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {product.name} is not available for pickup"
                )
        
        # Calculate prices
        unit_price = product.price
        if product.discount is not None and product.discount > 0:
            unit_price = unit_price * (1 - product.discount / 100)
        
        item_total = unit_price * item.quantity
        total_amount += item_total
        
        order_items_data.append({
            "product": product,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "total_price": item_total
        })
    
    # Calculate estimated delivery date based on max lead time
    max_lead_time = max([item_data["product"].lead_time_days or 0 for item_data in order_items_data], default=0)
    estimated_delivery_date = None
    if max_lead_time > 0:
        estimated_delivery_date = datetime.utcnow() + timedelta(days=max_lead_time)
    
    # Create order
    db_order = Order(
        supplier_id=order_data.supplier_id,
        consumer_id=consumer.id,
        status=OrderStatus.PENDING,
        total_amount=total_amount,
        delivery_method=order_data.delivery_method,
        estimated_delivery_date=estimated_delivery_date,
        created_by=current_user.id
    )
    db.add(db_order)
    db.flush()  # Flush to get order.id
    
    # Create order items
    for item_data in order_items_data:
        db_order_item = OrderItem(
            order_id=db_order.id,
            product_id=item_data["product"].id,
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            total_price=item_data["total_price"]
        )
        db.add(db_order_item)
    
    db.commit()
    
    # Reload order with relationships using joinedload for efficiency
    db.refresh(db_order)
    
    # Load supplier and consumer for response (we already have these from earlier queries)
    # Reuse the supplier and consumer we queried earlier, or query them once
    supplier = db.query(Supplier).filter(Supplier.id == db_order.supplier_id).first()
    consumer = db.query(Consumer).filter(Consumer.id == db_order.consumer_id).first()
    
    # Build response with product names - use the products we already loaded
    items_response = []
    # Create a map of product_id -> product for quick lookup
    product_map = {item_data["product"].id: item_data["product"] for item_data in order_items_data}
    
    for item in db_order.items:
        product = product_map.get(item.product_id)
        items_response.append(OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else f"Product {item.product_id}",
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price
        ))
    
    return OrderResponse(
        id=db_order.id,
        supplier_id=db_order.supplier_id,
        supplier_name=supplier.name if supplier else f"Supplier {db_order.supplier_id}",
        consumer_id=db_order.consumer_id,
        consumer_name=consumer.organization_name if consumer else f"Consumer {db_order.consumer_id}",
        status=db_order.status,
        total_amount=db_order.total_amount,
        delivery_method=db_order.delivery_method,
        estimated_delivery_date=db_order.estimated_delivery_date,
        created_by=db_order.created_by,
        created_at=db_order.created_at,
        items=items_response
    )


@router.get("/my", response_model=List[OrderResponse])
def list_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List orders for current user (consumer or supplier staff)"""
    orders = []
    
    # Check if user is a consumer
    consumer = db.query(Consumer).filter(Consumer.user_id == current_user.id).first()
    if consumer:
        # For consumer: orders where they are the consumer
        orders = db.query(Order).options(
            joinedload(Order.supplier),
            joinedload(Order.consumer),
            joinedload(Order.items)
        ).filter(Order.consumer_id == consumer.id).all()
    else:
        # For supplier staff: orders for their supplier(s)
        supplier_users = db.query(SupplierUser).filter(
            SupplierUser.user_id == current_user.id
        ).all()
        
        supplier_ids = [su.supplier_id for su in supplier_users]
        if supplier_ids:
            orders = db.query(Order).options(
                joinedload(Order.supplier),
                joinedload(Order.consumer),
                joinedload(Order.items)
            ).filter(Order.supplier_id.in_(supplier_ids)).all()
    
    # Build response with product names
    result = []
    for order in orders:
        items_response = []
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            items_response.append(OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=product.name if product else f"Product {item.product_id}",
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price
            ))
        
        result.append(OrderResponse(
            id=order.id,
            supplier_id=order.supplier_id,
            supplier_name=order.supplier.name,
            consumer_id=order.consumer_id,
            consumer_name=order.consumer.organization_name,
            status=order.status,
            total_amount=order.total_amount,
            delivery_method=order.delivery_method,
            estimated_delivery_date=order.estimated_delivery_date,
            created_by=order.created_by,
            created_at=order.created_at,
            items=items_response
        ))
    
    return result


@router.post("/{order_id}/reorder", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def reorder(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order based on a previous order (CONSUMER only)"""
    _, consumer = require_consumer_user(current_user, db)
    
    # Get the original order
    original_order = db.query(Order).options(
        joinedload(Order.items)
    ).filter(Order.id == order_id).first()
    
    if not original_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify the order belongs to the consumer
    if original_order.consumer_id != consumer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only reorder your own orders"
        )
    
    # Verify link is still accepted
    link = db.query(Link).filter(
        Link.supplier_id == original_order.supplier_id,
        Link.consumer_id == consumer.id,
        Link.status == LinkStatus.ACCEPTED
    ).first()
    
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must have an accepted link with this supplier to reorder"
        )
    
    # Create new order items from original order
    order_items = []
    total_amount = Decimal("0.00")
    product_cache = {}
    
    for original_item in original_order.items:
        product = product_cache.get(original_item.product_id)
        if not product:
            product = db.query(Product).filter(
                Product.id == original_item.product_id,
                Product.supplier_id == original_order.supplier_id,
                Product.is_active == True
            ).first()
            if not product:
                continue  # Skip if product no longer exists
            product_cache[original_item.product_id] = product
        
        # Use original quantity
        quantity = original_item.quantity
        
        # Validate stock
        if quantity > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.name}' is out of stock. Available: {product.stock}, Required: {quantity}"
            )
        
        # Calculate price
        unit_price = product.price
        if product.discount is not None and product.discount > 0:
            unit_price = unit_price * (1 - product.discount / 100)
        
        item_total = unit_price * quantity
        total_amount += item_total
        
        order_items.append({
            "product_id": product.id,
            "quantity": quantity,
            "unit_price": unit_price,
            "total_price": item_total
        })
    
    if not order_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reorder: no valid products found"
        )
    
    # Calculate estimated delivery date
    max_lead_time = max([product_cache[item["product_id"]].lead_time_days or 0 for item in order_items], default=0)
    estimated_delivery_date = None
    if max_lead_time > 0:
        estimated_delivery_date = datetime.utcnow() + timedelta(days=max_lead_time)
    
    # Create new order
    db_order = Order(
        supplier_id=original_order.supplier_id,
        consumer_id=consumer.id,
        status=OrderStatus.PENDING,
        total_amount=total_amount,
        delivery_method=original_order.delivery_method,
        estimated_delivery_date=estimated_delivery_date,
        created_by=current_user.id
    )
    db.add(db_order)
    db.flush()
    
    # Create order items
    db_order_items = []
    for item_data in order_items:
        db_order_item = OrderItem(
            order_id=db_order.id,
            product_id=item_data["product_id"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            total_price=item_data["total_price"]
        )
        db.add(db_order_item)
        db_order_items.append((db_order_item, item_data))
    
    # Flush all items to get their IDs
    db.flush()
    
    # Build response items
    items_response = []
    for db_order_item, item_data in db_order_items:
        items_response.append(OrderItemResponse(
            id=db_order_item.id,
            product_id=db_order_item.product_id,
            product_name=product_cache[item_data["product_id"]].name,
            quantity=db_order_item.quantity,
            unit_price=db_order_item.unit_price,
            total_price=db_order_item.total_price
        ))
    
    db.commit()
    db.refresh(db_order)
    
    supplier = db.query(Supplier).filter(Supplier.id == db_order.supplier_id).first()
    
    return OrderResponse(
        id=db_order.id,
        supplier_id=db_order.supplier_id,
        supplier_name=supplier.name if supplier else f"Supplier {db_order.supplier_id}",
        consumer_id=db_order.consumer_id,
        consumer_name=consumer.organization_name,
        status=db_order.status,
        total_amount=db_order.total_amount,
        delivery_method=db_order.delivery_method,
        estimated_delivery_date=db_order.estimated_delivery_date,
        created_by=db_order.created_by,
        created_at=db_order.created_at,
        items=items_response
    )


@router.post("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update order status (supplier Owner or Manager only)"""
    # Get order
    order = db.query(Order).options(
        joinedload(Order.supplier),
        joinedload(Order.consumer),
        joinedload(Order.items)
    ).filter(Order.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user has permission (OWNER or MANAGER) for this supplier
    require_supplier_owner_or_manager(order.supplier_id, current_user, db)
    
    # Validate new_status
    new_status = status_update.new_status
    if new_status not in ["accepted", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="new_status must be 'accepted' or 'rejected'"
        )
    
    old_status = order.status
    new_status_enum = OrderStatus.ACCEPTED if new_status == "accepted" else OrderStatus.REJECTED
    
    # Handle stock updates based on status changes
    if old_status == OrderStatus.PENDING and new_status_enum == OrderStatus.ACCEPTED:
        # Order is being accepted: reduce stock
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                # Check stock availability again (in case it changed since order creation)
                if item.quantity > product.stock:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot accept order: insufficient stock for product {product.name}. Available: {product.stock}, Required: {item.quantity}"
                    )
                product.stock -= item.quantity
                if product.stock < 0:
                    product.stock = 0  # Prevent negative stock
    
    elif old_status == OrderStatus.ACCEPTED and new_status_enum == OrderStatus.REJECTED:
        # Order was accepted but is now being rejected: restore stock
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.stock += item.quantity
    
    elif old_status == OrderStatus.REJECTED and new_status_enum == OrderStatus.ACCEPTED:
        # Order was rejected but is now being accepted: reduce stock
        for item in order.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                # Check stock availability
                if item.quantity > product.stock:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot accept order: insufficient stock for product {product.name}. Available: {product.stock}, Required: {item.quantity}"
                    )
                product.stock -= item.quantity
                if product.stock < 0:
                    product.stock = 0
    
    # Update order status
    order.status = new_status_enum
    
    db.commit()
    db.refresh(order)
    
    # Build response with product names
    items_response = []
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items_response.append(OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else f"Product {item.product_id}",
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price
        ))
    
    return OrderResponse(
        id=order.id,
        supplier_id=order.supplier_id,
        supplier_name=order.supplier.name,
        consumer_id=order.consumer_id,
        consumer_name=order.consumer.organization_name,
        status=order.status,
        total_amount=order.total_amount,
        delivery_method=order.delivery_method,
        estimated_delivery_date=order.estimated_delivery_date,
        created_by=order.created_by,
        created_at=order.created_at,
        items=items_response
    )
