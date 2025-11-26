from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from .models import GlobalRole, SupplierRole, LinkStatus, OrderStatus, ComplaintStatus, IncidentStatus


# ============================================================================
# Auth Schemas
# ============================================================================

class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str


class SupplierRoleInfo(BaseModel):
    """Supplier role information"""
    supplier_id: int
    role: SupplierRole

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    """User output schema with roles and relationships"""
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    global_role: Optional[GlobalRole] = None
    supplier_roles: List[SupplierRoleInfo] = []
    consumer_id: Optional[int] = None
    main_role: str  # "PLATFORM_ADMIN", "SUPPLIER_OWNER", "SUPPLIER_MANAGER", "SUPPLIER_SALES", "CONSUMER"

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """Login response with token and user info"""
    access_token: str
    token_type: str
    user: UserOut


class UserRegister(BaseModel):
    """User registration schema"""
    email: EmailStr
    password: str
    full_name: str


class Token(BaseModel):
    """Token response (legacy, use LoginResponse)"""
    access_token: str
    token_type: str


# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    global_role: Optional[GlobalRole] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Supplier Schemas
# ============================================================================

class SupplierBase(BaseModel):
    name: str
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierResponse(SupplierBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SupplierUserCreate(BaseModel):
    """Create supplier user (staff member)"""
    user_id: int
    role: SupplierRole


class SupplierUserOut(BaseModel):
    """Supplier user output with user details"""
    id: int
    supplier_id: int
    user_id: int
    role: SupplierRole
    created_at: datetime
    user: Optional[UserBase] = None  # Include user info when available

    class Config:
        from_attributes = True


# ============================================================================
# Consumer Schemas
# ============================================================================

class ConsumerBase(BaseModel):
    organization_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class ConsumerCreate(ConsumerBase):
    pass


class ConsumerResponse(ConsumerBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Link Schemas
# ============================================================================

class LinkCreate(BaseModel):
    supplier_id: int


class LinkUpdate(BaseModel):
    status: LinkStatus


class LinkStatusUpdate(BaseModel):
    """Update link status"""
    status: LinkStatus


class LinkResponse(BaseModel):
    id: int
    supplier_id: int
    consumer_id: int
    status: LinkStatus
    requested_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    supplier_name: str
    consumer_name: str

    class Config:
        from_attributes = True


# ============================================================================
# Product Schemas
# ============================================================================

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    unit: str
    price: Decimal
    discount: Optional[Decimal] = 0
    stock: Optional[int] = 0
    min_order_quantity: Optional[int] = 1
    delivery_available: Optional[bool] = True
    pickup_available: Optional[bool] = True
    lead_time_days: Optional[int] = 0


class ProductCreate(ProductBase):
    supplier_id: int


class ProductResponse(ProductBase):
    id: int
    supplier_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Order Schemas
# ============================================================================

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int


class OrderCreate(BaseModel):
    supplier_id: int
    items: List[OrderItemCreate]
    delivery_method: Optional[str] = None  # "delivery" or "pickup"


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    supplier_id: int
    supplier_name: str
    consumer_id: int
    consumer_name: str
    status: OrderStatus
    total_amount: Optional[Decimal] = None
    delivery_method: Optional[str] = None
    estimated_delivery_date: Optional[datetime] = None
    created_by: int
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    new_status: str  # "accepted" or "rejected"


# ============================================================================
# Message Schemas
# ============================================================================

class MessageCreate(BaseModel):
    supplier_id: int
    consumer_id: int
    order_id: Optional[int] = None
    text: str  # API uses "text" but maps to "content" in model
    file_url: Optional[str] = None


class MessageResponse(BaseModel):
    id: int
    supplier_id: int
    consumer_id: int
    order_id: Optional[int] = None
    sender_id: int
    sender_name: Optional[str] = None  # Full name of sender
    sender_role: Optional[str] = None  # Role: "CONSUMER", "OWNER", "MANAGER", "SALES"
    text: str  # API uses "text" but maps to "content" in model
    file_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Complaint Schemas
# ============================================================================

class ComplaintCreate(BaseModel):
    order_id: int
    description: str


class ComplaintUpdate(BaseModel):
    status: Optional[ComplaintStatus] = None
    resolution: Optional[str] = None


class ComplaintStatusUpdate(BaseModel):
    """Schema for updating complaint status"""
    status: ComplaintStatus
    resolution: Optional[str] = None


class ComplaintResponse(BaseModel):
    id: int
    order_id: int
    consumer_id: int
    supplier_id: int
    created_by: int
    handled_by: Optional[int] = None
    status: ComplaintStatus
    description: str
    resolution: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Incident Schemas
# ============================================================================

class IncidentCreate(BaseModel):
    supplier_id: int
    summary: str
    description: str
    complaint_id: Optional[int] = None


class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None


class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus


class IncidentResponse(BaseModel):
    id: int
    complaint_id: Optional[int] = None
    supplier_id: int
    summary: str
    description: str
    status: IncidentStatus
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
