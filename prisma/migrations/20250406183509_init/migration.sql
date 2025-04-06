-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SAFARWAY_ADMIN', 'SAFARWAY_USER', 'AGENCY_ADMIN', 'AGENCY_USER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TourType" AS ENUM ('ADVENTURE', 'CULTURAL', 'WILDLIFE', 'BEACH', 'MOUNTAIN', 'CITY', 'CRUISE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "profileImage" TEXT,
    "provider" TEXT DEFAULT 'EMAIL',
    "deviceTokens" TEXT[],
    "agencyId" TEXT,
    "inviteToken" TEXT,
    "invitedByUserId" TEXT,
    "invitedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "logo" TEXT,
    "media" TEXT[],
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourPackage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "duration" INTEGER NOT NULL,
    "maxGroupSize" INTEGER NOT NULL,
    "pricePerPerson" DOUBLE PRECISION NOT NULL,
    "tourType" "TourType" NOT NULL,
    "description" TEXT NOT NULL,
    "highlights" TEXT[],
    "includedItems" TEXT[],
    "excludedItems" TEXT[],
    "coverImage" TEXT,
    "galleryImages" TEXT[],
    "phoneNumber" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "cancellationPolicy" TEXT,
    "additionalInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT NOT NULL,

    CONSTRAINT "TourPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Itinerary" (
    "id" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "activities" JSONB NOT NULL,
    "meals" JSONB NOT NULL,
    "accommodation" JSONB NOT NULL,
    "transport" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tourPackageId" TEXT NOT NULL,

    CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "numberOfPeople" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tourPackageId" TEXT NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPackage" ADD CONSTRAINT "TourPackage_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_tourPackageId_fkey" FOREIGN KEY ("tourPackageId") REFERENCES "TourPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tourPackageId_fkey" FOREIGN KEY ("tourPackageId") REFERENCES "TourPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
