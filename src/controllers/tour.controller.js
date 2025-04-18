const { PrismaClient } = require('@prisma/client');
const ApiError = require('../utils/ApiError');
const { cacheResponse, invalidateCache } = require('../middleware/cache.middleware');

const prisma = new PrismaClient();

// Cache middleware for tours
const tourCacheMiddleware = cacheResponse(300, (req) => {
  // Generate a unique cache key based on query parameters
  const { page, limit, destination, minPrice, maxPrice, tourType, sortBy, order } = req.query;
  return `tours:${page || 1}:${limit || 10}:${destination || ''}:${minPrice || ''}:${maxPrice || ''}:${tourType || ''}:${sortBy || 'createdAt'}:${order || 'desc'}`;
});

// Get all tour packages with pagination and filtering
const getAllTourPackages = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      destination, 
      minPrice, 
      maxPrice, 
      tourType,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;
    
    // Parse pagination params safely
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where = {};
    
    if (destination) {
      where.destination = { 
        contains: destination, 
        mode: 'insensitive' 
      };
    }
    
    if (minPrice || maxPrice) {
      where.price = {};
      
      if (minPrice) {
        where.price.gte = parseFloat(minPrice);
      }
      
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice);
      }
    }
    
    if (tourType) {
      where.tourType = tourType;
    }

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['createdAt', 'price', 'duration', 'name'];
    const validSortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    
    // Validate sort order
    const validOrder = order === 'asc' ? 'asc' : 'desc';

    // Create sort object
    const orderBy = { [validSortField]: validOrder };

    // Use Prisma's count and findMany in parallel with Promise.all
    const [total, tourPackages] = await Promise.all([
      prisma.tourPackage.count({ where }),
      prisma.tourPackage.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          duration: true,
          destination: true,
          startDate: true,
          endDate: true,
          maxPeople: true,
          tourType: true,
          images: true,
          createdAt: true,
          updatedAt: true,
          // Only include necessary agency fields
          agency: {
            select: {
              name: true,
              contactEmail: true,
              contactPhone: true,
            },
          },
          // Don't include full itinerary in list view to reduce payload
          // Just include count for UI display
          _count: {
            select: {
              itinerary: true
            }
          }
        },
        skip,
        take: limitNum,
        orderBy,
      })
    ]);

    // Set cache-control header
    res.set('Cache-Control', 'public, max-age=300');

    res.json({
      data: tourPackages,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all tour packages error:', error);
    res.status(500).json({
      message: 'Error fetching tour packages',
      error: error.message,
    });
  }
};

// Get a single tour package by ID
const getTourPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const tourPackage = await prisma.tourPackage.findUnique({
      where: { id },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactPhone: true,
            address: true,
            // Exclude unnecessary agency fields
          },
        },
        itinerary: {
          orderBy: {
            dayNumber: 'asc'
          }
        },
      },
    });

    if (!tourPackage) {
      return res.status(404).json({
        message: 'Tour package not found',
      });
    }

    // Set cache-control header
    res.set('Cache-Control', 'public, max-age=300');

    res.json({
      data: tourPackage,
    });
  } catch (error) {
    console.error('Get tour package error:', error);
    res.status(500).json({
      message: 'Error fetching tour package',
      error: error.message,
    });
  }
};

// Search tour packages
const searchTourPackages = async (req, res) => {
  try {
    const { 
      query, 
      location, 
      destination, 
      startDate, 
      endDate, 
      minPrice, 
      maxPrice, 
      tourType,
      packageType,
      guests
    } = req.query;
    
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    console.log('Search parameters:', {
      location,
      startDate,
      endDate,
      packageType,
      guests,
      tourType
    });

    // Build search conditions
    const where = {};
    
    // Query can match name, description or destination
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { destination: { contains: query, mode: 'insensitive' } },
      ];
    }
    
    // Location can be either in destination field
    if (location) {
      where.destination = { contains: location, mode: 'insensitive' };
    } else if (destination) {
      where.destination = { contains: destination, mode: 'insensitive' };
    }
    
    // Handle date ranges
    if (startDate) {
      // Format is expected to be ISO date string
      const parsedStartDate = new Date(startDate);
      if (!isNaN(parsedStartDate.getTime())) {
        // Only include tours that are available on or after the requested start date
        where.startDate = { lte: parsedStartDate };
        where.endDate = { gte: parsedStartDate };
      }
    }
    
    if (endDate) {
      // Format is expected to be ISO date string
      const parsedEndDate = new Date(endDate);
      if (!isNaN(parsedEndDate.getTime())) {
        // Make sure the tour ends on or after this date
        if (!where.endDate) where.endDate = {};
        where.endDate.gte = parsedEndDate;
      }
    }
    
    // Handle price range
    if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice) };
    if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice) };
    
    // Handle tour type - can be either tourType or packageType field
    if (tourType) {
      where.tourType = tourType;
    } else if (packageType) {
      // Map packageType to tourType if needed
      where.tourType = packageType.toUpperCase();
    }
    
    // Handle number of guests (consider only packages that can accommodate the requested number)
    if (guests && parseInt(guests) > 0) {
      where.maxPeople = { gte: parseInt(guests) };
    }

    console.log('Search query:', JSON.stringify(where, null, 2));

    // Use Prisma's count and findMany in parallel with Promise.all
    const [total, tourPackages] = await Promise.all([
      prisma.tourPackage.count({ where }),
      prisma.tourPackage.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          duration: true,
          destination: true,
          startDate: true,
          endDate: true,
          maxPeople: true,
          tourType: true,
          images: true,
          createdAt: true,
          updatedAt: true,
          agency: {
            select: {
              name: true,
              contactEmail: true,
              contactPhone: true,
            },
          },
          _count: {
            select: {
              itinerary: true
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      })
    ]);

    res.json({
      data: tourPackages,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Search tour packages error:', error);
    res.status(500).json({
      message: 'Error searching tour packages',
      error: error.message,
    });
  }
};

// Create a new tour package
const createTourPackage = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      destination,
      startDate,
      endDate,
      maxPeople,
      tourType,
      inclusions,
      exclusions,
      itinerary,
      images,
    } = req.body;

    // Create tour package with itinerary using transaction for atomicity
    const tourPackage = await prisma.$transaction(async (tx) => {
      // Create the tour package first
      const newTourPackage = await tx.tourPackage.create({
        data: {
          name,
          description,
          price: parseFloat(price),
          duration: parseInt(duration),
          destination,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          maxPeople: parseInt(maxPeople),
          tourType,
          inclusions,
          exclusions,
          images: images || [],
          agencyId: req.user.agencyId,
        },
      });

      // Create itinerary items if provided
      if (itinerary && itinerary.length > 0) {
        await tx.itinerary.createMany({
          data: itinerary.map((day) => ({
            dayNumber: day.dayNumber,
            title: day.title,
            description: day.description,
            activities: day.activities,
            meals: day.meals,
            accommodation: day.accommodation,
            transport: day.transport,
            tourPackageId: newTourPackage.id,
          })),
        });
      }

      // Fetch the complete tour package with its itinerary
      return tx.tourPackage.findUnique({
        where: { id: newTourPackage.id },
        include: { itinerary: true },
      });
    });

    // Invalidate the tour cache
    await invalidateCache('tours:*');

    res.status(201).json({
      message: 'Tour package created successfully',
      data: tourPackage,
    });
  } catch (error) {
    console.error('Create tour package error:', error);
    res.status(500).json({
      message: 'Error creating tour package',
      error: error.message,
    });
  }
};

// Update a tour package
const updateTourPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      duration,
      destination,
      startDate,
      endDate,
      maxPeople,
      tourType,
      inclusions,
      exclusions,
      itinerary,
      images,
    } = req.body;

    // Check if tour package exists and belongs to the agency
    const existingPackage = await prisma.tourPackage.findFirst({
      where: {
        id,
        agencyId: req.user.agencyId,
      },
    });

    if (!existingPackage) {
      return res.status(404).json({
        message: 'Tour package not found or unauthorized',
      });
    }

    // Update tour package and itinerary in a transaction
    const updatedPackage = await prisma.$transaction(async (prisma) => {
      // Delete existing itinerary
      await prisma.itinerary.deleteMany({
        where: { tourPackageId: id },
      });

      // Update tour package with new itinerary
      return prisma.tourPackage.update({
        where: { id },
        data: {
          name,
          description,
          price: parseFloat(price),
          duration: parseInt(duration),
          destination,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          maxPeople: parseInt(maxPeople),
          tourType,
          inclusions,
          exclusions,
          images: images || existingPackage.images,
          itinerary: {
            create: itinerary.map((day) => ({
              dayNumber: day.dayNumber,
              title: day.title,
              description: day.description,
              activities: day.activities,
              meals: day.meals,
              accommodation: day.accommodation,
              transport: day.transport,
            })),
          },
        },
        include: {
          itinerary: true,
        },
      });
    });

    res.json({
      message: 'Tour package updated successfully',
      data: updatedPackage,
    });
  } catch (error) {
    console.error('Update tour package error:', error);
    res.status(500).json({
      message: 'Error updating tour package',
      error: error.message,
    });
  }
};

// Delete a tour package
const deleteTourPackage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tour package exists and belongs to the agency
    const existingPackage = await prisma.tourPackage.findFirst({
      where: {
        id,
        agencyId: req.user.agencyId,
      },
    });

    if (!existingPackage) {
      return res.status(404).json({
        message: 'Tour package not found or unauthorized',
      });
    }

    // Delete tour package (this will cascade delete itinerary)
    await prisma.tourPackage.delete({
      where: { id },
    });

    res.json({
      message: 'Tour package deleted successfully',
    });
  } catch (error) {
    console.error('Delete tour package error:', error);
    res.status(500).json({
      message: 'Error deleting tour package',
      error: error.message,
    });
  }
};

// Upload tour images
const uploadTourImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;

    // Check if tour package exists and belongs to the agency
    const existingPackage = await prisma.tourPackage.findFirst({
      where: {
        id,
        agencyId: req.user.agencyId,
      },
    });

    if (!existingPackage) {
      return res.status(404).json({
        message: 'Tour package not found or unauthorized',
      });
    }

    // Update tour package with new images
    const updatedPackage = await prisma.tourPackage.update({
      where: { id },
      data: {
        images: [...existingPackage.images, ...images],
      },
    });

    res.json({
      message: 'Tour images uploaded successfully',
      data: {
        images: updatedPackage.images,
      },
    });
  } catch (error) {
    console.error('Upload tour images error:', error);
    res.status(500).json({
      message: 'Error uploading tour images',
      error: error.message,
    });
  }
};

// Delete a tour image
const deleteTourImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;

    // Check if tour package exists and belongs to the agency
    const existingPackage = await prisma.tourPackage.findFirst({
      where: {
        id,
        agencyId: req.user.agencyId,
      },
    });

    if (!existingPackage) {
      return res.status(404).json({
        message: 'Tour package not found or unauthorized',
      });
    }

    // Remove the image from the images array
    const updatedImages = existingPackage.images.filter(img => img !== imageId);

    // Update tour package with remaining images
    const updatedPackage = await prisma.tourPackage.update({
      where: { id },
      data: {
        images: updatedImages,
      },
    });

    res.json({
      message: 'Tour image deleted successfully',
      data: {
        images: updatedPackage.images,
      },
    });
  } catch (error) {
    console.error('Delete tour image error:', error);
    res.status(500).json({
      message: 'Error deleting tour image',
      error: error.message,
    });
  }
};

// Apply the cache middleware to route handlers
getAllTourPackages.middleware = [tourCacheMiddleware];
getTourPackageById.middleware = [cacheResponse(300)];

// Export modules with middleware attached
module.exports = {
  getAllTourPackages,
  getTourPackageById,
  searchTourPackages,
  createTourPackage,
  updateTourPackage,
  deleteTourPackage,
  uploadTourImages,
  deleteTourImage,
}; 