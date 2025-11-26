#!/usr/bin/env python3
"""
Migration script to add MVP feature columns to the database.
Run this script to update your database schema.

Usage:
    python run_migration.py
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://scp_user:scp_password@localhost:5433/scp_db")

def run_migration():
    """Run the migration to add new columns"""
    engine = create_engine(DATABASE_URL)
    
    migration_sql = """
    -- Add columns to products table
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;

    -- Add columns to orders table
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(255),
    ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMP WITH TIME ZONE;

    -- Update existing products to have default values
    UPDATE products 
    SET delivery_available = COALESCE(delivery_available, TRUE), 
        pickup_available = COALESCE(pickup_available, TRUE), 
        lead_time_days = COALESCE(lead_time_days, 0) 
    WHERE delivery_available IS NULL OR pickup_available IS NULL OR lead_time_days IS NULL;
    """
    
    try:
        with engine.connect() as conn:
            # Execute migration
            for statement in migration_sql.split(';'):
                statement = statement.strip()
                if statement:
                    conn.execute(text(statement))
            conn.commit()
        print("✅ Migration completed successfully!")
        print("Added columns:")
        print("  - products.delivery_available")
        print("  - products.pickup_available")
        print("  - products.lead_time_days")
        print("  - orders.delivery_method")
        print("  - orders.estimated_delivery_date")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Running database migration...")
    run_migration()

