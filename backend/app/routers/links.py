from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from ..models import User, Consumer, Supplier, Link, LinkStatus, SupplierUser, SupplierRole
from ..schemas import LinkCreate, LinkResponse, LinkStatusUpdate
from ..deps import get_current_user, require_supplier_owner_or_manager, require_consumer_user

router = APIRouter(prefix="/links", tags=["links"])


@router.post("", response_model=LinkResponse, status_code=status.HTTP_201_CREATED)
def create_link_request(
    link_data: LinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a link request from consumer to supplier (CONSUMER only)"""
    # Get consumer profile (this will raise 403 if not a consumer)
    _, consumer = require_consumer_user(current_user, db)
    
    # Verify supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == link_data.supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Check if link already exists
    existing_link = db.query(Link).filter(
        Link.supplier_id == link_data.supplier_id,
        Link.consumer_id == consumer.id
    ).first()
    
    if existing_link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link already exists between this consumer and supplier"
        )
    
    # Create link request
    db_link = Link(
        supplier_id=link_data.supplier_id,
        consumer_id=consumer.id,
        status=LinkStatus.PENDING,
        requested_by=current_user.id
    )
    db.add(db_link)
    db.commit()
    db.refresh(db_link)
    
    # Load relationships for response
    db.refresh(db_link, ["supplier", "consumer"])
    
    return LinkResponse(
        id=db_link.id,
        supplier_id=db_link.supplier_id,
        consumer_id=db_link.consumer_id,
        status=db_link.status,
        requested_by=db_link.requested_by,
        created_at=db_link.created_at,
        updated_at=db_link.updated_at,
        supplier_name=db_link.supplier.name,
        consumer_name=db_link.consumer.organization_name
    )


@router.get("/my", response_model=List[LinkResponse])
def list_my_links(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all links for current user (as consumer or supplier staff)"""
    links = []
    
    # Check if user is a consumer
    consumer = db.query(Consumer).filter(Consumer.user_id == current_user.id).first()
    if consumer:
        links = db.query(Link).options(
            joinedload(Link.supplier),
            joinedload(Link.consumer)
        ).filter(Link.consumer_id == consumer.id).all()
    else:
        # For suppliers, get links where user has a role
        supplier_users = db.query(SupplierUser).filter(
            SupplierUser.user_id == current_user.id
        ).all()
        supplier_ids = [su.supplier_id for su in supplier_users]
        if supplier_ids:
            links = db.query(Link).options(
                joinedload(Link.supplier),
                joinedload(Link.consumer)
            ).filter(Link.supplier_id.in_(supplier_ids)).all()
    
    # Convert to response format with names
    return [
        LinkResponse(
            id=link.id,
            supplier_id=link.supplier_id,
            consumer_id=link.consumer_id,
            status=link.status,
            requested_by=link.requested_by,
            created_at=link.created_at,
            updated_at=link.updated_at,
            supplier_name=link.supplier.name,
            consumer_name=link.consumer.organization_name
        )
        for link in links
    ]


@router.post("/{link_id}/status", response_model=LinkResponse)
def update_link_status(
    link_id: int,
    status_update: LinkStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update link status with proper permission checks"""
    # Get link with relationships
    link = db.query(Link).options(
        joinedload(Link.supplier),
        joinedload(Link.consumer)
    ).filter(Link.id == link_id).first()
    
    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Link not found"
        )
    
    new_status = status_update.status
    
    # Check if user is consumer
    consumer = db.query(Consumer).filter(Consumer.user_id == current_user.id).first()
    is_consumer = consumer and consumer.id == link.consumer_id
    
    # Check if user is supplier staff (Owner/Manager)
    supplier_user = db.query(SupplierUser).filter(
        SupplierUser.supplier_id == link.supplier_id,
        SupplierUser.user_id == current_user.id
    ).first()
    is_supplier_owner_or_manager = (
        supplier_user and 
        supplier_user.role in [SupplierRole.OWNER, SupplierRole.MANAGER]
    )
    
    # Enforce permission rules based on status
    if new_status == LinkStatus.ACCEPTED:
        # Only supplier Owner/Manager can accept
        if not is_supplier_owner_or_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only supplier Owner or Manager can accept a link"
            )
        if link.status != LinkStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot accept link. Current status: {link.status}"
            )
    
    elif new_status == LinkStatus.BLOCKED:
        # Only supplier Owner/Manager can block/reject
        if not is_supplier_owner_or_manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only supplier Owner or Manager can block a link"
            )
        if link.status != LinkStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot block link. Current status: {link.status}"
            )
    
    elif new_status == LinkStatus.REMOVED:
        # Supplier Owner/Manager can remove, or consumer can remove if accepted
        if is_supplier_owner_or_manager:
            # Supplier can remove from any status
            pass
        elif is_consumer and link.status == LinkStatus.ACCEPTED:
            # Consumer can only remove if link is accepted
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only remove a link if you are the supplier staff, or if you are the consumer and the link is accepted"
            )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}"
        )
    
    # Update status
    link.status = new_status
    db.commit()
    db.refresh(link)
    
    return LinkResponse(
        id=link.id,
        supplier_id=link.supplier_id,
        consumer_id=link.consumer_id,
        status=link.status,
        requested_by=link.requested_by,
        created_at=link.created_at,
        updated_at=link.updated_at,
        supplier_name=link.supplier.name,
        consumer_name=link.consumer.organization_name
    )
