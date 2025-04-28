-- Step 1: Convert TicketAssignmentLog columns from enum to text to break dependency
ALTER TABLE "TicketAssignmentLog" 
  ALTER COLUMN "previousStatus" TYPE TEXT USING "previousStatus"::TEXT,
  ALTER COLUMN "newStatus" TYPE TEXT USING "newStatus"::TEXT;

-- Step 2: Now we can safely modify the enums
-- For TicketStatus

-- Convert SupportTicket.status to TEXT to break enum dependency
ALTER TABLE "SupportTicket" 
  ALTER COLUMN status TYPE TEXT USING status::TEXT,
  ALTER COLUMN status DROP DEFAULT;

-- Now we can drop and recreate the enum
DROP TYPE IF EXISTS "TicketStatus";
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- Convert back to the new enum, mapping ASSIGNED to IN_PROGRESS
ALTER TABLE "SupportTicket" 
  ALTER COLUMN status TYPE "TicketStatus" USING 
    CASE 
      WHEN status = 'ASSIGNED' THEN 'IN_PROGRESS'::TEXT 
      ELSE status::TEXT 
    END::text::"TicketStatus";

-- Restore default
ALTER TABLE "SupportTicket" ALTER COLUMN status SET DEFAULT 'OPEN'::text::"TicketStatus";

-- For TicketPriority
-- Convert priority column to TEXT first
ALTER TABLE "SupportTicket" 
  ALTER COLUMN priority TYPE TEXT USING priority::TEXT,
  ALTER COLUMN priority DROP DEFAULT;

-- Drop and recreate enum
DROP TYPE IF EXISTS "TicketPriority";
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- Convert back with proper mapping
ALTER TABLE "SupportTicket" 
  ALTER COLUMN priority TYPE "TicketPriority" USING 
    CASE 
      WHEN priority = 'URGENT' THEN 'HIGH'::TEXT 
      ELSE priority::TEXT 
    END::text::"TicketPriority";

-- Restore default
ALTER TABLE "SupportTicket" ALTER COLUMN priority SET DEFAULT 'MEDIUM'::text::"TicketPriority";

-- Create indexes for TourPackage
CREATE INDEX IF NOT EXISTS "TourPackage_status_destination_idx" ON "TourPackage"("status", "destination");
CREATE INDEX IF NOT EXISTS "TourPackage_status_tourType_idx" ON "TourPackage"("status", "tourType");
CREATE INDEX IF NOT EXISTS "TourPackage_pricePerPerson_idx" ON "TourPackage"("pricePerPerson");
CREATE INDEX IF NOT EXISTS "TourPackage_tourType_idx" ON "TourPackage"("tourType");
CREATE INDEX IF NOT EXISTS "TourPackage_createdAt_idx" ON "TourPackage"("createdAt");
CREATE INDEX IF NOT EXISTS "TourPackage_agencyId_idx" ON "TourPackage"("agencyId");
CREATE INDEX IF NOT EXISTS "TourPackage_status_idx" ON "TourPackage"("status");

-- Create indexes for Wishlist
CREATE INDEX IF NOT EXISTS "Wishlist_userId_idx" ON "Wishlist"("userId");
CREATE INDEX IF NOT EXISTS "Wishlist_tourPackageId_idx" ON "Wishlist"("tourPackageId"); 