-- Migration script to add MVP feature columns
-- Run this script against your PostgreSQL database using psql or your database client

-- Add columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;

-- Add columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(255),
ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMP WITH TIME ZONE;

-- Update existing products to have default values (if any exist)
UPDATE products 
SET delivery_available = COALESCE(delivery_available, TRUE), 
    pickup_available = COALESCE(pickup_available, TRUE), 
    lead_time_days = COALESCE(lead_time_days, 0);
