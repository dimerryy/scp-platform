from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum as SQLEnum, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base


class GlobalRole(str, enum.Enum):
    """Global platform roles"""
    PLATFORM_ADMIN = "PLATFORM_ADMIN"


class SupplierRole(str, enum.Enum):
    """Supplier-specific roles"""
    OWNER = "OWNER"
    MANAGER = "MANAGER"
    SALES = "SALES"


class LinkStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REMOVED = "removed"
    BLOCKED = "blocked"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    ESCALATED = "escalated"


class IncidentStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    global_role = Column(SQLEnum(GlobalRole), nullable=True)  # Optional platform admin role
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    supplier_users = relationship("SupplierUser", back_populates="user", cascade="all, delete-orphan")
    consumer = relationship("Consumer", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    contact_email = Column(String)
    contact_phone = Column(String)
    address = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    staff = relationship("SupplierUser", back_populates="supplier", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="supplier", cascade="all, delete-orphan")
    links = relationship("Link", back_populates="supplier", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="supplier", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="supplier", cascade="all, delete-orphan")


class Consumer(Base):
    __tablename__ = "consumers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    organization_name = Column(String, nullable=False)
    contact_email = Column(String)
    contact_phone = Column(String)
    address = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="consumer")
    links = relationship("Link", back_populates="consumer", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="consumer", cascade="all, delete-orphan")


class SupplierUser(Base):
    """Join table linking User to Supplier with a role"""
    __tablename__ = "supplier_users"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(SQLEnum(SupplierRole), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    supplier = relationship("Supplier", back_populates="staff")
    user = relationship("User", back_populates="supplier_users")


class Link(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    consumer_id = Column(Integer, ForeignKey("consumers.id"), nullable=False)
    status = Column(SQLEnum(LinkStatus), default=LinkStatus.PENDING, nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    supplier = relationship("Supplier", back_populates="links")
    consumer = relationship("Consumer", back_populates="links")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    unit = Column(String, nullable=False)  # e.g., "kg", "piece", "box"
    price = Column(Numeric(10, 2), nullable=False)
    discount = Column(Numeric(5, 2), default=0)  # percentage
    stock = Column(Integer, default=0)
    min_order_quantity = Column(Integer, default=1)
    delivery_available = Column(Boolean, default=True)  # Can be delivered
    pickup_available = Column(Boolean, default=True)  # Can be picked up
    lead_time_days = Column(Integer, default=0)  # Lead time in days
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    supplier = relationship("Supplier", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product", cascade="all, delete-orphan")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    consumer_id = Column(Integer, ForeignKey("consumers.id"), nullable=False)
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    total_amount = Column(Numeric(10, 2))
    delivery_method = Column(String, nullable=True)  # "delivery" or "pickup"
    estimated_delivery_date = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    supplier = relationship("Supplier", back_populates="orders")
    consumer = relationship("Consumer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    consumer_id = Column(Integer, ForeignKey("consumers.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    file_url = Column(String, nullable=True)
    audio_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    supplier = relationship("Supplier")
    consumer = relationship("Consumer")
    order = relationship("Order")
    sender = relationship("User")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    consumer_id = Column(Integer, ForeignKey("consumers.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    handled_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SQLEnum(ComplaintStatus), default=ComplaintStatus.OPEN, nullable=False)
    description = Column(Text, nullable=False)
    resolution = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    order = relationship("Order", back_populates="complaints")
    consumer = relationship("Consumer")
    supplier = relationship("Supplier")
    creator = relationship("User", foreign_keys=[created_by])
    handler = relationship("User", foreign_keys=[handled_by])


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    summary = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SQLEnum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    complaint = relationship("Complaint")
    supplier = relationship("Supplier", back_populates="incidents")
    creator = relationship("User")
