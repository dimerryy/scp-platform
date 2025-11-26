from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .database import engine, Base
from . import models  # Import models to ensure all tables are registered with Base.metadata
from .routers import auth, suppliers, consumers, links, orders, complaints, chat, products, incidents

app = FastAPI(
    title="Supplier-Consumer Platform API",
    description="B2B platform for suppliers and institutional consumers",
    version="1.0.0"
)


@app.on_event("startup")
def create_tables():
    """Create database tables on application startup.
    
    Note: In production, use Alembic migrations instead of create_all().
    This is only suitable for development/testing environments.
    """
    Base.metadata.create_all(bind=engine)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(suppliers.router)
app.include_router(consumers.router)
app.include_router(links.router)
app.include_router(orders.router)
app.include_router(complaints.router)
app.include_router(chat.router)
app.include_router(products.router)
app.include_router(incidents.router)

# Mount static files for uploads
upload_dir = Path("uploads")
upload_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")


@app.get("/")
def root():
    return {"message": "Supplier-Consumer Platform API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}

