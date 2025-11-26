from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from pathlib import Path

from ..database import get_db
from ..models import User, Consumer, Supplier, Link, LinkStatus, Message, Order, SupplierUser, SupplierRole
from ..schemas import MessageCreate, MessageResponse
from ..deps import get_current_user, require_consumer_user

router = APIRouter(prefix="/chat", tags=["chat"])

# Configure upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

def save_upload_file(file: UploadFile) -> Optional[str]:
    """Save uploaded file and return URL"""
    try:
        # Generate unique filename
        file_ext = Path(file.filename).suffix if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = file.file.read()
            buffer.write(content)
        
        # Return relative URL (in production, use actual storage service)
        return f"/uploads/{unique_filename}"
    except Exception as e:
        print(f"Error saving file: {e}")
        return None


@router.post("/messages/upload", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message_with_file(
    supplier_id: int = Form(...),
    consumer_id: int = Form(...),
    text: str = Form(""),
    order_id: Optional[int] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a message with file attachment"""
    file_url = None
    if file:
        file_url = save_upload_file(file)
    
    message_data = MessageCreate(
        supplier_id=supplier_id,
        consumer_id=consumer_id,
        text=text,
        order_id=order_id,
        file_url=file_url
    )
    
    return _create_message_internal(message_data, current_user, db)


@router.post("/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new message (any user with accepted link)"""
    return _create_message_internal(message_data, current_user, db)


def _create_message_internal(
    message_data: MessageCreate,
    current_user: User,
    db: Session
) -> MessageResponse:
    """Internal function to create a message"""
    # Verify supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == message_data.supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Verify consumer exists
    consumer = db.query(Consumer).filter(Consumer.id == message_data.consumer_id).first()
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumer not found"
        )
    
    # Validate that there is an accepted link between supplier and consumer
    link = db.query(Link).filter(
        Link.supplier_id == message_data.supplier_id,
        Link.consumer_id == message_data.consumer_id,
        Link.status == LinkStatus.ACCEPTED
    ).first()
    
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must have an accepted link with this supplier/consumer to send messages"
        )
    
    # Validate that current user is either the consumer or supplier staff
    is_consumer = consumer.user_id == current_user.id
    is_supplier_staff = False
    
    if not is_consumer:
        supplier_user = db.query(SupplierUser).filter(
            SupplierUser.supplier_id == message_data.supplier_id,
            SupplierUser.user_id == current_user.id
        ).first()
        is_supplier_staff = supplier_user is not None
    
    if not (is_consumer or is_supplier_staff):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only send messages as part of an accepted link"
        )
    
    # If order_id is provided, validate it exists and belongs to the supplier/consumer
    if message_data.order_id:
        order = db.query(Order).filter(Order.id == message_data.order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        if order.supplier_id != message_data.supplier_id or order.consumer_id != message_data.consumer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order does not belong to the specified supplier and consumer"
            )
    
    # Create message (map "text" from API to "content" in model)
    db_message = Message(
        supplier_id=message_data.supplier_id,
        consumer_id=message_data.consumer_id,
        order_id=message_data.order_id,
        sender_id=current_user.id,
        content=message_data.text,  # Map "text" to "content"
        file_url=message_data.file_url
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Get sender info
    sender = db.query(User).filter(User.id == current_user.id).first()
    sender_name = sender.full_name if sender else None
    
    # Determine sender role
    sender_role = None
    if is_consumer:
        sender_role = "CONSUMER"
    elif is_supplier_staff:
        supplier_user = db.query(SupplierUser).filter(
            SupplierUser.supplier_id == message_data.supplier_id,
            SupplierUser.user_id == current_user.id
        ).first()
        if supplier_user:
            if supplier_user.role == SupplierRole.OWNER:
                sender_role = "OWNER"
            elif supplier_user.role == SupplierRole.MANAGER:
                sender_role = "MANAGER"
            elif supplier_user.role == SupplierRole.SALES:
                sender_role = "SALES"
    
    # Return response (map "content" from model to "text" in API)
    return MessageResponse(
        id=db_message.id,
        supplier_id=db_message.supplier_id,
        consumer_id=db_message.consumer_id,
        order_id=db_message.order_id,
        sender_id=db_message.sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        text=db_message.content,  # Map "content" to "text"
        file_url=db_message.file_url,
        created_at=db_message.created_at
    )


@router.get("/threads/{supplier_id}/{consumer_id}", response_model=List[MessageResponse])
def get_thread_messages(
    supplier_id: int,
    consumer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages between supplier and consumer (ordered by time)"""
    # Verify supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Verify consumer exists
    consumer = db.query(Consumer).filter(Consumer.id == consumer_id).first()
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumer not found"
        )
    
    # Validate that there is an accepted link between supplier and consumer
    link = db.query(Link).filter(
        Link.supplier_id == supplier_id,
        Link.consumer_id == consumer_id,
        Link.status == LinkStatus.ACCEPTED
    ).first()
    
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must have an accepted link with this supplier/consumer to view messages"
        )
    
    # Validate that current user is either the consumer or supplier staff
    is_consumer = consumer.user_id == current_user.id
    is_supplier_staff = False
    
    if not is_consumer:
        supplier_user = db.query(SupplierUser).filter(
            SupplierUser.supplier_id == supplier_id,
            SupplierUser.user_id == current_user.id
        ).first()
        is_supplier_staff = supplier_user is not None
    
    if not (is_consumer or is_supplier_staff):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view messages as part of an accepted link"
        )
    
    # Get messages ordered by time
    messages = db.query(Message).filter(
        Message.supplier_id == supplier_id,
        Message.consumer_id == consumer_id
    ).order_by(Message.created_at.asc()).all()
    
    # Map messages to response format (content -> text) with sender info
    result = []
    for msg in messages:
        # Get sender user
        sender_user = db.query(User).filter(User.id == msg.sender_id).first()
        sender_name = sender_user.full_name if sender_user else None
        
        # Determine sender role
        sender_role = None
        # Check if sender is the consumer
        if consumer.user_id == msg.sender_id:
            sender_role = "CONSUMER"
        else:
            # Check if sender is supplier staff
            supplier_user = db.query(SupplierUser).filter(
                SupplierUser.supplier_id == supplier_id,
                SupplierUser.user_id == msg.sender_id
            ).first()
            if supplier_user:
                if supplier_user.role == SupplierRole.OWNER:
                    sender_role = "OWNER"
                elif supplier_user.role == SupplierRole.MANAGER:
                    sender_role = "MANAGER"
                elif supplier_user.role == SupplierRole.SALES:
                    sender_role = "SALES"
        
        result.append(MessageResponse(
            id=msg.id,
            supplier_id=msg.supplier_id,
            consumer_id=msg.consumer_id,
            order_id=msg.order_id,
            sender_id=msg.sender_id,
            sender_name=sender_name,
            sender_role=sender_role,
            text=msg.content,  # Map "content" to "text"
            file_url=msg.file_url,
            created_at=msg.created_at
        ))
    
    return result
