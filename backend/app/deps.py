from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Optional
import os
from dotenv import load_dotenv

from .database import get_db
from .models import User, SupplierUser, SupplierRole, GlobalRole, Consumer

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )
    return user


def require_authenticated_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require an authenticated user (alias for get_current_user)"""
    return current_user


def require_platform_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require user to have PLATFORM_ADMIN global role"""
    if current_user.global_role != GlobalRole.PLATFORM_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required"
        )
    return current_user


def get_user_supplier_role(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Optional[SupplierUser]:
    """Get user's role for a specific supplier"""
    supplier_user = db.query(SupplierUser).filter(
        SupplierUser.supplier_id == supplier_id,
        SupplierUser.user_id == current_user.id
    ).first()
    return supplier_user


def require_supplier_role(
    supplier_id: int,
    required_roles: list[SupplierRole],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SupplierUser:
    """Require user to have one of the specified roles for a supplier"""
    supplier_user = get_user_supplier_role(supplier_id, current_user, db)
    if not supplier_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with this supplier"
        )
    if supplier_user.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User does not have required role. Required: {required_roles}"
        )
    return supplier_user


def require_supplier_owner_or_manager(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SupplierUser:
    """Require user to be OWNER or MANAGER for the supplier"""
    return require_supplier_role(
        supplier_id,
        [SupplierRole.OWNER, SupplierRole.MANAGER],
        current_user,
        db
    )


def require_supplier_staff_any(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SupplierUser:
    """Require user to have any supplier role (OWNER, MANAGER, or SALES)"""
    return require_supplier_role(
        supplier_id,
        [SupplierRole.OWNER, SupplierRole.MANAGER, SupplierRole.SALES],
        current_user,
        db
    )


def require_owner(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SupplierUser:
    """Require user to be OWNER for the supplier"""
    return require_supplier_role(
        supplier_id,
        [SupplierRole.OWNER],
        current_user,
        db
    )


def require_consumer_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> tuple[User, Consumer]:
    """Require user to be associated with a Consumer"""
    consumer = db.query(Consumer).filter(Consumer.user_id == current_user.id).first()
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with a consumer"
        )
    return current_user, consumer
