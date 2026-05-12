-- Enable Realtime Replication for specific tables
-- This script adds the tables to the 'supabase_realtime' publication which enables the Realtime API.
-- Run this in your Supabase SQL Editor.

DO $$
BEGIN
  -- 1. Ensure the publication exists (usually created by default)
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE accounts, products, transactions, transaction_items;
  ELSE
    -- 1. Add 'accounts' table if not already present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'accounts') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
    END IF;

    -- 2. Add 'products' table if not already present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE products;
    END IF;

    -- 3. Add 'transactions' table if not already present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transactions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    END IF;

    -- 4. Add 'transaction_items' table if not already present
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'transaction_items') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE transaction_items;
    END IF;
  END IF;
END $$;
