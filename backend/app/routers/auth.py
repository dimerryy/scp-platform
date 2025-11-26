from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

from ..database import get_db
from ..models import User, SupplierUser, Consumer, GlobalRole, SupplierRole
from ..schemas import UserRegister, LoginResponse, UserOut, SupplierRoleInfo, UserResponse
from ..deps import SECRET_KEY, ALGORITHM

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

# Configure bcrypt context with explicit backend to avoid compatibility issues
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
    bcrypt__ident="2b"  # Use bcrypt 2b identifier
)

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def determine_main_role(user: User, db: Session) -> str:
    """Determine the main role for a user"""
    # Check global role first
    if user.global_role == GlobalRole.PLATFORM_ADMIN:
        return "PLATFORM_ADMIN"
    
    # Check supplier roles (prioritize OWNER > MANAGER > SALES)
    supplier_users = db.query(SupplierUser).filter(
        SupplierUser.user_id == user.id
    ).all()
    
    if supplier_users:
        roles = [su.role for su in supplier_users]
        if SupplierRole.OWNER in roles:
            return "SUPPLIER_OWNER"
        elif SupplierRole.MANAGER in roles:
            return "SUPPLIER_MANAGER"
        elif SupplierRole.SALES in roles:
            return "SUPPLIER_SALES"
    
    # Check if consumer
    consumer = db.query(Consumer).filter(Consumer.user_id == user.id).first()
    if consumer:
        return "CONSUMER"
    
    return "USER"  # Fallback


def build_user_out(user: User, db: Session) -> UserOut:
    """Build UserOut object with roles and relationships"""
    # Get supplier roles
    supplier_users = db.query(SupplierUser).filter(
        SupplierUser.user_id == user.id
    ).all()
    supplier_roles = [
        SupplierRoleInfo(supplier_id=su.supplier_id, role=su.role)
        for su in supplier_users
    ]
    
    # Get consumer ID
    consumer = db.query(Consumer).filter(Consumer.user_id == user.id).first()
    consumer_id = consumer.id if consumer else None
    
    # Determine main role
    main_role = determine_main_role(user, db)
    
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        global_role=user.global_role,
        supplier_roles=supplier_roles,
        consumer_id=consumer_id,
        main_role=main_role
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/login", response_model=LoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    platform: Optional[str] = Query(None, description="Platform: 'mobile' or 'web'"),
    db: Session = Depends(get_db)
):
    """Login and get access token with user info
    
    Platform restrictions:
    - mobile: Only Consumers and Sales staff can login
    - web: Only Owners and Managers can login
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )
    
    # Build user output to check roles
    user_out = build_user_out(user, db)
    
    # Platform-based role validation
    # Platform Admins can login from any platform
    if user_out.global_role == GlobalRole.PLATFORM_ADMIN or user_out.main_role == "PLATFORM_ADMIN":
        # Platform admins bypass platform restrictions
        pass
    elif platform == "mobile":
        # Mobile: Only Consumers and Sales staff allowed
        # Reject Owners and Managers (but allow Platform Admins)
        is_owner_or_manager = any(
            role.role in [SupplierRole.OWNER, SupplierRole.MANAGER]
            for role in user_out.supplier_roles
        ) or user_out.main_role in ["SUPPLIER_OWNER", "SUPPLIER_MANAGER"]
        
        if is_owner_or_manager:
            # Return generic error to hide the real reason
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    elif platform == "web":
        # Web: Only Owners and Managers allowed
        # Reject Sales staff (but allow Platform Admins and Consumers)
        is_sales = any(
            role.role == SupplierRole.SALES
            for role in user_out.supplier_roles
        ) or user_out.main_role == "SUPPLIER_SALES"
        
        if is_sales:
            # Return generic error to hide the real reason
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_out
    )
