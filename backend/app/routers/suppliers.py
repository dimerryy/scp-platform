from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
import secrets
import string

from ..database import get_db
from ..models import User, Supplier, SupplierUser, SupplierRole
from ..schemas import SupplierCreate, SupplierResponse, SupplierUserOut, UserBase
from ..deps import get_current_user, require_owner
from ..routers.auth import get_password_hash

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=List[SupplierResponse])
def list_suppliers(
    db: Session = Depends(get_db)
):
    """List all active suppliers (public endpoint for consumers to discover and request links)"""
    suppliers = db.query(Supplier).filter(Supplier.is_active == True).all()
    return suppliers


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier_data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new supplier and become its OWNER"""
    # Create supplier
    db_supplier = Supplier(**supplier_data.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    
    # Automatically assign OWNER role to creator
    db_role = SupplierUser(
        supplier_id=db_supplier.id,
        user_id=current_user.id,
        role=SupplierRole.OWNER
    )
    db.add(db_role)
    db.commit()
    
    return db_supplier


@router.get("/my", response_model=List[SupplierResponse])
def list_my_suppliers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all suppliers where current user is staff (Owner/Manager/Sales)"""
    # Get all supplier IDs where user has a role
    supplier_users = db.query(SupplierUser).filter(
        SupplierUser.user_id == current_user.id
    ).all()
    
    supplier_ids = [su.supplier_id for su in supplier_users]
    suppliers = db.query(Supplier).filter(Supplier.id.in_(supplier_ids)).all()
    
    return suppliers


class StaffInviteRequest(BaseModel):
    """Request to invite staff by email"""
    email: EmailStr
    role: SupplierRole  # MANAGER or SALES
    full_name: Optional[str] = None  # Optional - will be derived from email if not provided


def generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password


class StaffAddResponse(BaseModel):
    """Response when adding staff - includes temporary password"""
    id: int
    supplier_id: int
    user_id: int
    role: SupplierRole
    created_at: str
    user: Optional[UserBase] = None
    temporary_password: str  # Password for the new user to login
    message: str  # Instructions for the owner

    class Config:
        from_attributes = True


@router.post("/{supplier_id}/staff", response_model=StaffAddResponse, status_code=status.HTTP_201_CREATED)
def add_staff(
    supplier_id: int,
    staff_data: StaffInviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add staff member to supplier (OWNER only)
    
    If user doesn't exist, creates a new user account with a temporary password.
    The owner should share this password with the staff member so they can login.
    """
    # Check if user is OWNER
    require_owner(supplier_id, current_user, db)
    
    # Validate role (only MANAGER or SALES allowed, not OWNER)
    if staff_data.role == SupplierRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign OWNER role via this endpoint. OWNER is only assigned when creating a supplier."
        )
    
    # Check if supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Find or create user by email
    target_user = db.query(User).filter(User.email == staff_data.email).first()
    user_created = False
    temp_password = None
    
    if not target_user:
        # User doesn't exist - create new user account
        temp_password = generate_temp_password()
        hashed_password = get_password_hash(temp_password)
        
        # Use provided full_name or derive from email
        if staff_data.full_name:
            full_name = staff_data.full_name
        else:
            # Extract name from email as fallback
            full_name = staff_data.email.split('@')[0].replace('.', ' ').title()
        
        target_user = User(
            email=staff_data.email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True
        )
        db.add(target_user)
        db.flush()  # Flush to get the user ID
        user_created = True
    else:
        # User exists - check if they already have a role in this supplier
        existing_role = db.query(SupplierUser).filter(
            SupplierUser.supplier_id == supplier_id,
            SupplierUser.user_id == target_user.id
        ).first()
        
        if existing_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has a role in this supplier"
            )
    
    # Create new role
    db_role = SupplierUser(
        supplier_id=supplier_id,
        user_id=target_user.id,
        role=staff_data.role
    )
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    db.refresh(target_user)
    
    # Build response
    message = (
        f"Staff member added successfully. "
        f"{'New account created. ' if user_created else 'Existing user. '}"
        f"Share the temporary password with {target_user.email} so they can login."
    )
    
    # Format created_at properly
    from datetime import datetime as dt
    created_at_str = db_role.created_at.isoformat() if isinstance(db_role.created_at, dt) else str(db_role.created_at)
    
    return StaffAddResponse(
        id=db_role.id,
        supplier_id=db_role.supplier_id,
        user_id=db_role.user_id,
        role=db_role.role,
        created_at=created_at_str,
        user=UserBase(email=target_user.email, full_name=target_user.full_name),
        temporary_password=temp_password if user_created else "*** (user already exists, password unchanged) ***",
        message=message
    )


@router.get("/{supplier_id}/staff", response_model=List[SupplierUserOut])
def list_supplier_staff(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all staff members for a supplier (OWNER/MANAGER only)"""
    # Check if user has access (OWNER or MANAGER)
    from ..deps import require_supplier_owner_or_manager
    require_supplier_owner_or_manager(supplier_id, current_user, db)
    
    # Get all staff for this supplier
    staff_roles = db.query(SupplierUser).filter(
        SupplierUser.supplier_id == supplier_id
    ).all()
    
    # Build response with user info
    result = []
    for staff_role in staff_roles:
        user = db.query(User).filter(User.id == staff_role.user_id).first()
        result.append(SupplierUserOut(
            id=staff_role.id,
            supplier_id=staff_role.supplier_id,
            user_id=staff_role.user_id,
            role=staff_role.role,
            created_at=staff_role.created_at,
            user=UserBase(email=user.email, full_name=user.full_name) if user else None
        ))
    
    return result


@router.delete("/{supplier_id}/staff/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_staff(
    supplier_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove staff member from supplier (OWNER only)"""
    # Check if user is OWNER
    require_owner(supplier_id, current_user, db)
    
    # Prevent removing yourself
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself as staff. Transfer ownership first."
        )
    
    # Find the staff role
    staff_role = db.query(SupplierUser).filter(
        SupplierUser.supplier_id == supplier_id,
        SupplierUser.user_id == user_id
    ).first()
    
    if not staff_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found for this supplier"
        )
    
    # Prevent removing another OWNER (if multiple owners exist)
    if staff_role.role == SupplierRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove another OWNER. Transfer ownership first."
        )
    
    db.delete(staff_role)
    db.commit()
    
    return None


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete/deactivate supplier account (OWNER only)"""
    # Check if user is OWNER
    require_owner(supplier_id, current_user, db)
    
    # Get supplier
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Soft delete by setting is_active to False
    # This preserves data for compliance/archival
    supplier.is_active = False
    
    db.commit()
    
    return None
