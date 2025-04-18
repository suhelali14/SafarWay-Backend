/*
  Warnings:

  - You are about to drop the column `message` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `excludedItems` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `galleryImages` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `highlights` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `includedItems` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `maxGroupSize` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerPerson` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `subtitle` on the `TourPackage` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `TourPackage` table. All the data in the column will be lost.
  - Added the required column `description` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `raisedById` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destination` to the `TourPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `TourPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxPeople` to the `TourPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `TourPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `TourPackage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `TourPackage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PAYPAL');

-- AlterEnum
ALTER TYPE "TicketPriority" ADD VALUE 'URGENT';

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'ASSIGNED';

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_userId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "specialRequests" TEXT;

-- AlterTable
ALTER TABLE "SupportTicket" DROP COLUMN "message",
DROP COLUMN "subject",
DROP COLUMN "userId",
ADD COLUMN     "agencyId" TEXT,
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "raisedById" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TourPackage" DROP COLUMN "excludedItems",
DROP COLUMN "galleryImages",
DROP COLUMN "highlights",
DROP COLUMN "includedItems",
DROP COLUMN "maxGroupSize",
DROP COLUMN "pricePerPerson",
DROP COLUMN "subtitle",
DROP COLUMN "title",
ADD COLUMN     "destination" TEXT NOT NULL,
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "exclusions" TEXT[],
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "inclusions" TEXT[],
ADD COLUMN     "maxPeople" INTEGER NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "TicketAssignmentLog" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "previousStatus" "TicketStatus" NOT NULL,
    "newStatus" "TicketStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAssignmentLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignmentLog" ADD CONSTRAINT "TicketAssignmentLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignmentLog" ADD CONSTRAINT "TicketAssignmentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
