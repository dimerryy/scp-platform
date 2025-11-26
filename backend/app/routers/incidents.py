from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import User, Incident, SupplierUser, GlobalRole
from ..schemas import IncidentResponse, IncidentStatusUpdate
from ..deps import get_current_user, require_supplier_owner_or_manager, require_platform_admin

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("/my", response_model=List[IncidentResponse])
def list_my_incidents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List incidents for current user"""
    incidents = []
    
    # Check if user is platform admin
    if current_user.global_role == GlobalRole.PLATFORM_ADMIN:
        # Platform admin sees all incidents
        incidents = db.query(Incident).all()
    else:
        # Supplier staff see incidents for their supplier(s)
        supplier_users = db.query(SupplierUser).filter(
            SupplierUser.user_id == current_user.id
        ).all()
        
        supplier_ids = [su.supplier_id for su in supplier_users]
        if supplier_ids:
            incidents = db.query(Incident).filter(Incident.supplier_id.in_(supplier_ids)).all()
    
    return incidents


@router.post("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: int,
    status_update: IncidentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update incident status (supplier Manager/Owner or platform admin)"""
    # Get incident
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    # Check permissions: platform admin OR supplier Owner/Manager
    is_platform_admin = current_user.global_role == GlobalRole.PLATFORM_ADMIN
    
    if not is_platform_admin:
        # Check if user has permission (OWNER or MANAGER) for this supplier
        require_supplier_owner_or_manager(incident.supplier_id, current_user, db)
    
    # Update status
    incident.status = status_update.status
    
    db.commit()
    db.refresh(incident)
    
    return incident

