const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = {
  Package: prisma.tourPackage,
  Booking: prisma.booking,
  User: prisma.user,
  Payment: prisma.payment,
  Agency: prisma.agency,
}; 