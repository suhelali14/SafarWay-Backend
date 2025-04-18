/*
  Warnings:

  - The values [URGENT] on the enum `TicketPriority` will be removed. If these variants are still used in the database, this will fail.
  - The values [ASSIGNED] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `paymentMethod` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `specialRequests` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `agencyId` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToId` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `raisedById` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `discountPrice` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `exclusions` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `inclusions` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `maxPeople` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `minCapacity` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `validFrom` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `validTill` on the `TourPackage` table. All the data in the column will be lost.
  - The `status` column on the `TourPackage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketAssignmentLog` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `message` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxGroupSize` to the `TourPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerPerson` to the `TourPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `TourPackage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TicketPriority_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
ALTER TABLE "SupportTicket" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "SupportTicket" ALTER COLUMN "priority" TYPE "TicketPriority_new" USING ("priority"::text::"TicketPriority_new");
ALTER TYPE "TicketPriority" RENAME TO "TicketPriority_old";
ALTER TYPE "TicketPriority_new" RENAME TO "TicketPriority";
DROP TYPE "TicketPriority_old";
ALTER TABLE "SupportTicket" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
ALTER TABLE "SupportTicket" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SupportTicket" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "TicketStatus_old";
ALTER TABLE "SupportTicket" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_agencyId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_raisedById_fkey";

-- DropForeignKey
ALTER TABLE "TicketAssignmentLog" DROP CONSTRAINT "TicketAssignmentLog_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketAssignmentLog" DROP CONSTRAINT "TicketAssignmentLog_userId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "paymentMethod",
DROP COLUMN "specialRequests";

-- AlterTable
ALTER TABLE "SupportTicket" DROP COLUMN "agencyId",
DROP COLUMN "assignedToId",
DROP COLUMN "description",
DROP COLUMN "raisedById",
DROP COLUMN "title",
ADD COLUMN     "message" TEXT NOT NULL,
ADD COLUMN     "subject" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TourPackage" DROP COLUMN "createdBy",
DROP COLUMN "destination",
DROP COLUMN "discountPrice",
DROP COLUMN "endDate",
DROP COLUMN "exclusions",
DROP COLUMN "images",
DROP COLUMN "inclusions",
DROP COLUMN "maxPeople",
DROP COLUMN "minCapacity",
DROP COLUMN "name",
DROP COLUMN "price",
DROP COLUMN "startDate",
DROP COLUMN "validFrom",
DROP COLUMN "validTill",
ADD COLUMN     "excludedItems" TEXT[],
ADD COLUMN     "galleryImages" TEXT[],
ADD COLUMN     "highlights" TEXT[],
ADD COLUMN     "includedItems" TEXT[],
ADD COLUMN     "maxGroupSize" INTEGER NOT NULL,
ADD COLUMN     "pricePerPerson" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "TicketAssignmentLog";

-- DropEnum
DROP TYPE "PackageStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
