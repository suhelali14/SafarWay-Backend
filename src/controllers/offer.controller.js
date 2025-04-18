const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ApiError = require('../utils/ApiError');

// Create a new offer (admin only)
exports.createOffer = async (req, res, next) => {
  try {
    const {
      title,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      code,
      tourPackageId,
      status
    } = req.body;

    // Validate data
    if (!title || !description || !discountType || !discountValue || !startDate || !endDate) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Check if tourPackage exists if provided
    if (tourPackageId) {
      const tourPackage = await prisma.tourPackage.findUnique({
        where: { id: tourPackageId }
      });

      if (!tourPackage) {
        throw new ApiError(404, 'Tour package not found');
      }
    }

    // Create the offer
    const offer = await prisma.offer.create({
      data: {
        title,
        description,
        discountType,
        discountValue,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        code,
        tourPackageId,
        status: status || 'ACTIVE'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// Get all offers (admin)
exports.getAllOffers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: {
          tourPackage: {
            select: {
              id: true,
              title: true,
              coverImage: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.offer.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: offers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get offer by ID
exports.getOfferById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        tourPackage: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            coverImage: true,
            pricePerPerson: true
          }
        }
      }
    });

    if (!offer) {
      throw new ApiError(404, 'Offer not found');
    }

    res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    next(error);
  }
};

// Update offer (admin only)
exports.updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      code,
      tourPackageId,
      status
    } = req.body;

    // Check if offer exists
    const existingOffer = await prisma.offer.findUnique({
      where: { id }
    });

    if (!existingOffer) {
      throw new ApiError(404, 'Offer not found');
    }

    // Check if tourPackage exists if provided
    if (tourPackageId) {
      const tourPackage = await prisma.tourPackage.findUnique({
        where: { id: tourPackageId }
      });

      if (!tourPackage) {
        throw new ApiError(404, 'Tour package not found');
      }
    }

    // Update the offer
    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: {
        title,
        description,
        discountType,
        discountValue,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        code,
        tourPackageId,
        status
      }
    });

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: updatedOffer
    });
  } catch (error) {
    next(error);
  }
};

// Delete offer (admin only)
exports.deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if offer exists
    const existingOffer = await prisma.offer.findUnique({
      where: { id }
    });

    if (!existingOffer) {
      throw new ApiError(404, 'Offer not found');
    }

    // Delete the offer
    await prisma.offer.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get valid offers (public)
exports.getValidOffers = async (req, res, next) => {
  try {
    const today = new Date();

    const offers = await prisma.offer.findMany({
      where: {
        startDate: {
          lte: today
        },
        endDate: {
          gte: today
        },
        status: 'ACTIVE'
      },
      include: {
        tourPackage: {
          select: {
            id: true,
            title: true,
            coverImage: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: offers
    });
  } catch (error) {
    next(error);
  }
}; 