-- CreateIndex
CREATE INDEX IF NOT EXISTS "TourPackage_status_idx" ON "TourPackage"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TourPackage_tourType_idx" ON "TourPackage"("tourType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TourPackage_pricePerPerson_idx" ON "TourPackage"("pricePerPerson");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TourPackage_agencyId_idx" ON "TourPackage"("agencyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TourPackage_createdAt_idx" ON "TourPackage"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TourPackage_destination_idx" ON "TourPackage"("destination");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TourPackage_multi_search_idx" ON "TourPackage"("status", "tourType");

-- Adding text search index
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for faster text search
CREATE INDEX IF NOT EXISTS "TourPackage_destination_title_trgm_idx" ON "TourPackage" USING GIN (destination gin_trgm_ops, title gin_trgm_ops); 