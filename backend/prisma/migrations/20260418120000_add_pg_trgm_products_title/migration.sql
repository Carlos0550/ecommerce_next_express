-- Enable pg_trgm extension for similarity-based search on Products.title
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index using trigrams to accelerate ILIKE / similarity queries on title
CREATE INDEX IF NOT EXISTS "Products_title_trgm_idx"
  ON "Products"
  USING GIN ("title" gin_trgm_ops);
