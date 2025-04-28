-- Add missing columns to TourPackage table
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "title" TEXT;

-- Copy data from 'name' column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'TourPackage' AND column_name = 'name') THEN
        UPDATE "TourPackage" SET "title" = "name" WHERE "title" IS NULL;
    END IF;
END $$;

-- Make title required after populating it
ALTER TABLE "TourPackage" ALTER COLUMN "title" SET NOT NULL;

-- Add other potentially missing columns referenced in the schema
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "priceType" TEXT;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "minimumAge" INTEGER;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "maximumPeople" INTEGER;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "isFlexible" BOOLEAN DEFAULT FALSE;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "difficultyLevel" TEXT;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "validFrom" TIMESTAMPTZ;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "validTill" TIMESTAMPTZ;

-- Rename cancelation to cancellation if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'TourPackage' AND column_name = 'cancelationPolicy') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'TourPackage' AND column_name = 'cancellationPolicy') THEN
        ALTER TABLE "TourPackage" ADD COLUMN "cancellationPolicy" TEXT;
        UPDATE "TourPackage" SET "cancellationPolicy" = "cancelationPolicy";
    END IF;
END $$;

-- Ensure arrays are properly defined
ALTER TABLE "TourPackage" ALTER COLUMN "highlights" SET DEFAULT '{}';
ALTER TABLE "TourPackage" ALTER COLUMN "includedItems" SET DEFAULT '{}';
ALTER TABLE "TourPackage" ALTER COLUMN "excludedItems" SET DEFAULT '{}';
ALTER TABLE "TourPackage" ALTER COLUMN "galleryImages" SET DEFAULT '{}'; 