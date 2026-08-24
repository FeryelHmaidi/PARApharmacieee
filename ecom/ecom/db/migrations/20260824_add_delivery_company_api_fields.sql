-- Migration: Add API connection fields to delivery_companies
ALTER TABLE public.delivery_companies
ADD COLUMN IF NOT EXISTS api_base_url text,
ADD COLUMN IF NOT EXISTS api_key_header_name text DEFAULT 'X-API-Key',
ADD COLUMN IF NOT EXISTS test_endpoint_path text DEFAULT '/ping',
ADD COLUMN IF NOT EXISTS tracking_url_template text,
ADD COLUMN IF NOT EXISTS connection_status text DEFAULT 'untested',
ADD COLUMN IF NOT EXISTS last_tested_at timestamptz;

-- Run with: psql <connection-string> -f 20260824_add_delivery_company_api_fields.sql