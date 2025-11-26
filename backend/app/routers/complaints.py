from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import (
    User, Consumer, Supplier, Order, Complaint, Incident,
    ComplaintStatus, IncidentStatus, SupplierUser, SupplierRole
)
from ..deps import (
    get_current_user, 
    require_supplier_owner_or_manager, 
    require_supplier_role, 
    get_user_supplier_role,
    require_consumer_user
)
from ..schemas import ComplaintCreate, ComplaintResponse, IncidentResponse, IncidentStatusUpdate, ComplaintStatusUpdate

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("/", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint(
    complaint_data: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new complaint linked to an order (CONSUMER only)"""
    # Get consumer profile (this will raise 403 if not a consumer)
    _, consumer = require_consumer_user(current_user, db)
    
    # Get order and validate it belongs to the consumer
    order = db.query(Order).filter(Order.id == complaint_data.order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.consumer_id != consumer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create complaints for your own orders"
        )
    
    # Create complaint
    db_complaint = Complaint(
        order_id=complaint_data.order_id,
        consumer_id=consumer.id,
        supplier_id=order.supplier_id,
        created_by=current_user.id,
        status=ComplaintStatus.OPEN,
        description=complaint_data.description
    )
    db.add(db_complaint)
    db.flush()  # Flush to get complaint.id
    
    # Automatically create an Incident with status open
    db_incident = Incident(
        complaint_id=db_complaint.id,
        supplier_id=order.supplier_id,
        summary=f"Complaint #{db_complaint.id} - Order #{order.id}",
        description=f"Complaint created for order {order.id}: {complaint_data.description}",
        status=IncidentStatus.OPEN,
        created_by=current_user.id
    )
    db.add(db_incident)
    
    db.commit()
    db.refresh(db_complaint)
    
    return db_complaint


@router.get("/my", response_model=List[ComplaintResponse])
def list_my_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List complaints for current user (consumer or supplier staff)"""
    complaints = []
    
    # Check if user is a consumer
    consumer = db.query(Consumer).filter(Consumer.user_id == current_user.id).first()
    if consumer:
        # Get complaints on their orders
        complaints = db.query(Complaint).filter(Complaint.consumer_id == consumer.id).all()
    else:
        # For supplier staff, get complaints for all suppliers where user has a role
        supplier_users = db.query(SupplierUser).filter(
            SupplierUser.user_id == current_user.id
        ).all()
        
        supplier_ids = [su.supplier_id for su in supplier_users]
        if supplier_ids:
            complaints = db.query(Complaint).filter(Complaint.supplier_id.in_(supplier_ids)).all()
    
    return complaints


@router.post("/{complaint_id}/status", response_model=ComplaintResponse)
def update_complaint_status(
    complaint_id: int,
    status_update: ComplaintStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update complaint status
    
    - Sales can change status to: in_progress, resolved, escalated
    - Manager/Owner can change escalated complaints to: resolved
    """
    # Get complaint
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    # Check if user is supplier staff for this complaint's supplier
    supplier_user = get_user_supplier_role(complaint.supplier_id, current_user, db)
    
    if not supplier_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be supplier staff to update complaint status"
        )
    
    # Validate status transitions based on role
    new_status = status_update.status
    
    if supplier_user.role == SupplierRole.SALES:
        # Sales can: open -> in_progress, in_progress -> resolved/escalated
        if complaint.status == ComplaintStatus.OPEN and new_status not in [ComplaintStatus.IN_PROGRESS]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sales can only change OPEN complaints to IN_PROGRESS"
            )
        if complaint.status == ComplaintStatus.IN_PROGRESS and new_status not in [ComplaintStatus.RESOLVED, ComplaintStatus.ESCALATED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sales can only change IN_PROGRESS complaints to RESOLVED or ESCALATED"
            )
        if complaint.status not in [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sales cannot change status from {complaint.status} to {new_status}"
            )
    elif supplier_user.role in [SupplierRole.MANAGER, SupplierRole.OWNER]:
        # Manager/Owner can change any complaint status to resolved
        if new_status != ComplaintStatus.RESOLVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Manager/Owner can only change complaints to RESOLVED"
            )
        # Allow changing from any status to resolved
        if complaint.status == ComplaintStatus.RESOLVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Complaint is already resolved"
            )
    
    # Update complaint
    complaint.status = new_status
    complaint.handled_by = current_user.id
    
    if status_update.resolution:
        complaint.resolution = status_update.resolution
    
    # Also update associated incident status
    incident = db.query(Incident).filter(Incident.complaint_id == complaint_id).first()
    if incident:
        if new_status == ComplaintStatus.IN_PROGRESS:
            incident.status = IncidentStatus.IN_PROGRESS
        elif new_status == ComplaintStatus.RESOLVED:
            incident.status = IncidentStatus.RESOLVED
        elif new_status == ComplaintStatus.ESCALATED:
            # Keep incident as in_progress when escalated (manager will resolve)
            incident.status = IncidentStatus.IN_PROGRESS
    
    db.commit()
    db.refresh(complaint)
    
    return complaint


@router.post("/{complaint_id}/escalate", response_model=ComplaintResponse)
def escalate_complaint(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Escalate a complaint (Sales staff only) - convenience endpoint"""
    # Get complaint
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    
    # Check if user is Sales staff for this complaint's supplier
    supplier_user = get_user_supplier_role(complaint.supplier_id, current_user, db)
    
    if not supplier_user or supplier_user.role != SupplierRole.SALES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sales staff can escalate complaints"
        )
    
    # Only allow escalation from IN_PROGRESS status
    if complaint.status != ComplaintStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only escalate complaints that are IN_PROGRESS"
        )
    
    # Update complaint status to escalated
    complaint.status = ComplaintStatus.ESCALATED
    complaint.handled_by = current_user.id
    
    # Update associated incident status
    incident = db.query(Incident).filter(Incident.complaint_id == complaint_id).first()
    if incident:
        incident.status = IncidentStatus.IN_PROGRESS
    
    db.commit()
    db.refresh(complaint)
    
    return complaint


@router.post("/incidents/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: int,
    status_update: IncidentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update incident status (supplier OWNER or MANAGER only)"""
    # Get incident
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    # Check if user has permission (OWNER or MANAGER) for this supplier
    require_supplier_owner_or_manager(incident.supplier_id, current_user, db)
    
    # Update status
    incident.status = status_update.status
    
    db.commit()
    db.refresh(incident)
    
    return incident
