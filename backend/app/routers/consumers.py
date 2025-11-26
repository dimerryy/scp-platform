from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Consumer
from ..schemas import ConsumerCreate, ConsumerResponse
from ..deps import get_current_user, require_consumer_user

router = APIRouter(prefix="/consumers", tags=["consumers"])


@router.post("", response_model=ConsumerResponse, status_code=status.HTTP_201_CREATED)
def create_consumer(
    consumer_data: ConsumerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new consumer profile"""
    # Check if consumer already exists for this user
    existing_consumer = db.query(Consumer).filter(Consumer.user_id == current_user.id).first()
    if existing_consumer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consumer profile already exists for this user"
        )
    
    # Create consumer
    db_consumer = Consumer(
        user_id=current_user.id,
        **consumer_data.model_dump()
    )
    db.add(db_consumer)
    db.commit()
    db.refresh(db_consumer)
    
    return db_consumer
