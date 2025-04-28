const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ApiError = require('../utils/ApiError');

// Add package to wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.id;

    // Check if package exists
    const tourPackage = await prisma.tourPackage.findUnique({
      where: { id: packageId }
    });

    if (!tourPackage) {
      throw new ApiError(404, 'Tour package not found');
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_tourPackageId: {
          userId,
          tourPackageId: packageId
        }
      }
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Package is already in your wishlist',
        data: existing
      });
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        tourPackageId: packageId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Package added to wishlist successfully',
      data: wishlistItem
    });
  } catch (error) {
    next(error);
  }
};

// Remove package from wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if wishlist item exists and belongs to the user
    const wishlistItem = await prisma.wishlist.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!wishlistItem) {
      throw new ApiError(404, 'Wishlist item not found or unauthorized');
    }

    // Delete from wishlist
    await prisma.wishlist.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Package removed from wishlist successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get all packages
exports.getAllPackages = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      tourType, 
      minPrice, 
      maxPrice, 
      duration,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      fields
    } = req.query;
    
    // Parse pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter conditions
    const where = {
      status: 'PUBLISHED'
    };
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (tourType) {
      where.tourType = tourType;
    }
    
    if (minPrice || maxPrice) {
      where.pricePerPerson = {};
      
      if (minPrice) {
        where.pricePerPerson.gte = parseFloat(minPrice);
      }
      
      if (maxPrice) {
        where.pricePerPerson.lte = parseFloat(maxPrice);
      }
    }
    
    if (duration) {
      where.duration = parseInt(duration);
    }
    
    // Determine the sort order
    const orderBy = {};
    orderBy[sortBy] = sortOrder;
    
    // Build include object for related entities
    const include = {
      agency: {
        select: {
          id: true,
          name: true,
          logo: true
        }
      },
      _count: {
        select: {
          bookings: true
        }
      }
    };
    
    // Parallel promises for better performance
    const [packages, total] = await Promise.all([
      prisma.tourPackage.findMany({
        where,
        include,
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.tourPackage.count({ where })
    ]);
    
    // If user is logged in, check if packages are in wishlist
    let wishlistItems = [];
    if (req.user && req.user.id) {
      wishlistItems = await prisma.wishlist.findMany({
        where: {
          userId: req.user.id,
          tourPackageId: {
            in: packages.map(pkg => pkg.id)
          }
        }
      });
    }
    
    // Add wishlist info to packages
    const packagesWithWishlist = packages.map(pkg => {
      // Create a filtered package object with only the fields we need
      const filteredPackage = {
        id: pkg.id,
        title: pkg.title,
        summary: pkg.summary,
        price: pkg.price,
        pricePerPerson: pkg.pricePerPerson,
        discountPrice: pkg.discountPrice,
        destination: pkg.destination,
        duration: pkg.duration,
        tourType: pkg.tourType,
        coverImage: pkg.coverImage,
        startDate: pkg.startDate,
        endDate: pkg.endDate,
        agencyId: pkg.agencyId,
        images: pkg.images,
        status: pkg.status,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
        agency: pkg.agency,
        isInWishlist: wishlistItems.some(item => item.tourPackageId === pkg.id),
        bookingCount: pkg._count?.bookings || 0
      };
      return filteredPackage;
    });
    
    // Set cache control header for browsers
    res.set('Cache-Control', 'public, max-age=600'); // 10 minutes
    
    res.status(200).json({
      success: true,
      data: packagesWithWishlist,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get package by ID
exports.getPackageById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Build include object for related entities
    const include = {
      agency: {
        select: {
          id: true,
          name: true,
          logo: true,
          contactEmail: true,
          contactPhone: true
        }
      },
      itinerary: {
        orderBy: {
          day: 'asc'
        }
      },
      _count: {
        select: {
          bookings: true
        }
      }
    };
    
    const tourPackage = await prisma.tourPackage.findUnique({
      where: { id },
      include
    });
    
    if (!tourPackage) {
      return res.status(404).json({
        success: false,
        message: 'Tour package not found'
      });
    }
    
    // Check if package is in user's wishlist
    let isInWishlist = false;
    if (req.user && req.user.id) {
      const wishlistItem = await prisma.wishlist.findFirst({
        where: {
          userId: req.user.id,
          tourPackageId: id
        }
      });
      isInWishlist = !!wishlistItem;
    }
    
    // Format response
    const bookingCount = tourPackage._count?.bookings || 0;
    delete tourPackage._count; // Remove _count from response

    const response = {
      ...tourPackage,
      isInWishlist,
      bookingCount
    };
    
    // Set cache control header for browsers
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    
    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
};

// Get similar packages
exports.getSimilarPackages = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get the package to find similar ones
    const package = await prisma.tourPackage.findUnique({
      where: { id },
      select: {
        tourType: true,
        pricePerPerson: true
      }
    });
    
    if (!package) {
      throw new ApiError(404, 'Tour package not found');
    }
    
    // Find similar packages based on type and price range
    const minPrice = package.pricePerPerson * 0.7; // 30% cheaper
    const maxPrice = package.pricePerPerson * 1.3; // 30% more expensive
    
    const similarPackages = await prisma.tourPackage.findMany({
      where: {
        id: { not: id }, // Exclude the current package
        status: 'ACTIVE',
        tourType: package.tourType,
        pricePerPerson: {
          gte: minPrice,
          lte: maxPrice
        }
      },
      include: {
        agency: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 4 // Limit to 4 similar packages
    });
    
    res.status(200).json({
      success: true,
      data: similarPackages
    });
  } catch (error) {
    next(error);
  }
};

// Search packages
exports.searchPackages = async (req, res, next) => {
  try {
    const { 
      query, 
      destination, 
      tourType, 
      minPrice, 
      maxPrice, 
      duration,
      page = 1,
      limit = 10
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build search conditions
    const where = {
      status: 'ACTIVE'
    };
    
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { subtitle: { contains: query, mode: 'insensitive' } }
      ];
    }
    
    if (destination) {
      // Search destination in title, description, or highlights
      where.OR = [
        ...(where.OR || []),
        { title: { contains: destination, mode: 'insensitive' } },
        { description: { contains: destination, mode: 'insensitive' } }
      ];
    }
    
    if (tourType) {
      where.tourType = tourType;
    }
    
    if (minPrice || maxPrice) {
      where.pricePerPerson = {};
      
      if (minPrice) {
        where.pricePerPerson.gte = parseFloat(minPrice);
      }
      
      if (maxPrice) {
        where.pricePerPerson.lte = parseFloat(maxPrice);
      }
    }
    
    if (duration) {
      where.duration = parseInt(duration);
    }
    
    // Get matching packages
    const packages = await prisma.tourPackage.findMany({
      where,
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: parseInt(limit)
    });
    
    // Get total count for pagination
    const total = await prisma.tourPackage.count({ where });
    
    res.status(200).json({
      success: true,
      data: packages,
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