/*
  Warnings:

  - The `status` column on the `TourPackage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `minCapacity` to the `TourPackage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "TourPackage" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "discountPrice" DOUBLE PRECISION,
ADD COLUMN     "minCapacity" INTEGER NOT NULL,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validTill" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "PackageStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
