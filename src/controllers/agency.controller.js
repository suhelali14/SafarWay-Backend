const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { PrismaClient } = require('@prisma/client');
const { cacheHelpers, checkRedisStatus, redis, redisEnabled } = require('../middleware/cache.middleware');

const prisma = new PrismaClient();

// Helper function to safely get data from cache
const getFromCache = async (key) => {
  try {
    if (!redisEnabled || !redis) return null;
    
    const prefixedKey = `safarway:${key}`;
    const data = await redis.get(prefixedKey);
    return data;
  } catch (error) {
    console.error(`Error getting from cache for key ${key}:`, error);
    return null;
  }
};

// Helper function to safely store data in cache
const storeInCache = async (key, data, ttl = 3600) => {
  try {
    if (!redisEnabled || !redis) return false;
    
    const prefixedKey = `safarway:${key}`;
    await redis.set(prefixedKey, data, 'EX', ttl);
    return true;
  } catch (error) {
    console.error(`Error storing in cache for key ${key}:`, error);
    return false;
  }
};

// Dashboard
const getDashboardSummary = async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    console.log(req)
    const [
      totalActivePackages,
      totalPackages,
      totalBookings,
      monthlyBookings,
      totalCustomers,
      bookingsForRevenue,
      monthlyBookingsForRevenue,
      recentBookings
    ] = await Promise.all([
      prisma.tourPackage.count({
        where: { agencyId, status: 'PUBLISHED' }
      }),
      prisma.tourPackage.count({
        where: { agencyId }
      }),
      prisma.booking.count({
        where: { agencyId }
      }),
      prisma.booking.count({
        where: {
          agencyId,
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.user.count({
        where: { invitedByUserId: agencyId, role: 'CUSTOMER' }
      }),
      prisma.booking.findMany({
        where: { agencyId },
        select: { totalPrice: true }
      }),
      prisma.booking.findMany({
        where: {
          agencyId,
          createdAt: { gte: startOfMonth }
        },
        select: { totalPrice: true }
      }),
      prisma.booking.findMany({
        where: { agencyId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          tourPackage: {
            select: {
              id: true,
              title: true,
              destination: true
            }
          }
        }
      })
    ]);

    // Calculate total revenue from bookings
    const totalRevenue = bookingsForRevenue.reduce(
      (sum, booking) => sum + (booking.totalPrice || 0), 
      0
    );
    
    // Calculate monthly revenue from bookings
    const monthlyRevenue = monthlyBookingsForRevenue.reduce(
      (sum, booking) => sum + (booking.totalPrice || 0), 
      0
    );
    
    // Generate chart data for the last 6 months
    const bookingsLast6Months = await prisma.booking.findMany({
      where: {
        agencyId,
        createdAt: {
          gte: new Date(new Date().setMonth(today.getMonth() - 6))
        }
      },
      select: {
        totalPrice: true,
        createdAt: true
      }
    });

    const chartData = processBookingsForChart(bookingsLast6Months);

    res.status(200).json({
      totalActivePackages,
      totalPackages,
      totalBookings,
      monthlyBookings,
      totalCustomers,
      revenue: totalRevenue,
      monthlyRevenue: monthlyRevenue,
      recentBookings: recentBookings.map(booking => ({
        id: booking.id,
        customer: booking.user.name,
        package: booking.tourPackage.name,
        destination: booking.tourPackage.destination,
        amount: booking.totalPrice,
        date: booking.createdAt
      })),
      chartData
    });
  } catch (error) {
    console.error("Error fetching agency dashboard:", error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message
    });
  }
};

// Helper function to process bookings data for chart
const processBookingsForChart = (bookings) => {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const bookingsByMonth = {};
  
  // Initialize with last 6 months
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = `${monthNames[month.getMonth()]} ${month.getFullYear()}`;
    bookingsByMonth[monthKey] = 0;
  }
  
  // Sum bookings by month
  bookings.forEach(booking => {
    const date = new Date(booking.createdAt);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    if (bookingsByMonth[monthKey] !== undefined) {
      bookingsByMonth[monthKey] += booking.totalPrice || 0;
    }
  });
  
  // Convert to array format for charts
  return Object.entries(bookingsByMonth).map(([name, value]) => ({
    name,
    value
  }));
};

// Packages
const getPackages = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, package_type, destination, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const agencyId = req.params.agencyId || req.user.agencyId;
    
    // Generate a cache key based on query parameters
    const cacheKey = `agency:${agencyId}:packages:${pageNum}:${limitNum}:${status || ''}:${package_type || ''}:${destination || ''}:${search || ''}`;
    
    // Start performance tracking
    const startTime = Date.now();
    let queryTime = 0;
    
    // Try to get data from cache first
    let packages = null;
    let total = 0;
    let cacheHit = false;
    
    try {
      // Use safeRedisOperation in case Redis is down
      const cachedData = await getFromCache(cacheKey);
      if (cachedData) {
        cacheHit = true;
        const parsedData = JSON.parse(cachedData);
        packages = parsedData.packages;
        total = parsedData.total;
        console.log(`Cache HIT for ${cacheKey}`);
      }
    } catch (cacheError) {
      // Log cache error but continue with database query
      console.error(`Cache error for ${cacheKey}:`, cacheError);
    }
    
    // If cache miss, fetch from database
    if (!cacheHit) {
      console.log(`Cache MISS for ${cacheKey}`);
      // Build filter object
      const filter = { agencyId };
      
      if (status) {
        filter.status = status;
      }
      
      if (package_type) {
        filter.tourType = package_type;
      }
      
      if (destination) {
        filter.destination = {
          contains: destination,
          mode: 'insensitive'
        };
      }
      
      if (search) {
        filter.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { destination: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      const dbStartTime = Date.now();
      
      // Fetch packages with pagination
      [packages, total] = await Promise.all([
        prisma.tourPackage.findMany({
          where: filter,
          orderBy: {
            createdAt: 'desc'
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          include: {
            agency: {
              select: {
                name: true,
                logo: true
              }
            },
            destinations: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prisma.tourPackage.count({ where: filter })
      ]);
      
      queryTime = Date.now() - dbStartTime;
      
      // Cache the results
      try {
        await storeInCache(
          cacheKey,
          JSON.stringify({ packages, total }),
          // Cache for 10 minutes (600 seconds)
          600
        );
      } catch (cachingError) {
        // Log caching error but continue with response
        console.error(`Error caching packages for ${cacheKey}:`, cachingError);
      }
    }
    
    // Set cache response headers
    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    res.set('X-Cache-Key', cacheKey);
    if (queryTime > 0) {
      res.set('X-Query-Time', `${queryTime}ms`);
    }
    
    // Format the response with performance data
    const response = {
      status: "success",
      message: "Packages retrieved successfully",
      data: packages,
      meta: {
        total,
        pages: Math.ceil(total / limitNum),
        page: pageNum,
        limit: limitNum
      },
      performance: {
        total: Date.now() - startTime,
        queryTime,
        cacheHit
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching packages:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error fetching packages',
      error: error.message
    });
  }
};

const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;
    
    // Generate a cache key
    const cacheKey = `agency:${agencyId}:package:${id}`;
    
    // Start performance tracking
    const startTime = Date.now();
    let queryTime = 0;
    let cacheHit = false;
    
    // Try to get data from cache first
    let packageData = null;
    
    try {
      const cachedData = await getFromCache(cacheKey);
      if (cachedData) {
        cacheHit = true;
        packageData = JSON.parse(cachedData);
        console.log(`Cache HIT for ${cacheKey}`);
      }
    } catch (cacheError) {
      // Log cache error but continue with database query
      console.error(`Cache error for ${cacheKey}:`, cacheError);
    }
    
    // If cache miss, fetch from database
    if (!packageData) {
      console.log(`Cache MISS for ${cacheKey}`);
      
      const dbStartTime = Date.now();
      
      // Check if package exists and belongs to the agency
      packageData = await prisma.tourPackage.findFirst({
        where: {
          id,
          agencyId
        },
        include: {
          agency: {
            select: {
              name: true,
              logo: true,
              contactEmail: true,
              contactPhone: true
            }
          },
          destinations: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true
            }
          },
          itinerary: {
            orderBy: {
              day: 'asc'
            }
          }
        }
      });
      
      queryTime = Date.now() - dbStartTime;
      
      // If package found, cache it
      if (packageData) {
        try {
          await storeInCache(
            cacheKey,
            JSON.stringify(packageData),
            // Cache for 60 minutes (3600 seconds)
            3600
          );
        } catch (cachingError) {
          // Log caching error but continue with response
          console.error(`Error caching package for ${cacheKey}:`, cachingError);
        }
      }
    }
    
    if (!packageData) {
      return res.status(404).json({
        status: 'error',
        message: 'Package not found or you do not have permission to view this package'
      });
    }
    
    // Format response data with JSON strings parsed if needed
    const responseData = {
      ...packageData,
      includedItems: parseJsonArrayIfString(packageData.includedItems),
      excludedItems: parseJsonArrayIfString(packageData.excludedItems),
      highlights: parseJsonArrayIfString(packageData.highlights),
      itinerary: packageData.itinerary || []
    };
    
    // Set cache response headers
    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    res.set('X-Cache-Key', cacheKey);
    if (queryTime > 0) {
      res.set('X-Query-Time', `${queryTime}ms`);
    }
    
    return res.status(200).json({
      status: "success",
      message: "Package retrieved successfully",
      data: responseData,
      performance: {
        total: Date.now() - startTime,
        queryTime,
        cacheHit
      }
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error fetching package',
      error: error.message
    });
  }
};

// Helper function to parse JSON string to array if needed
const parseJsonArrayIfString = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  try {
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const createPackage = async (req, res) => {
  try {
    const { 
      title, description, price, pricePerPerson, discountPrice, discountedPrice, duration, 
      maxGroupSize, groupSize, packageType, tourType, destination, inclusions, exclusions, 
      itinerary, status, startDate, endDate, validFrom, validTill,
      phoneNumber, email, whatsapp, cancelationPolicy, additionalInfo, minimumAge,
      maximumPeople, difficultyLevel, isFlexible, subtitle, summary ,coverImage ,images
    } = req.body;

    // Process cover image
    
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      coverImage = `/uploads/${req.files.coverImage[0].filename}`;
    }

    // Process gallery images
    let galleryImages = images;
    if (req.files && req.files.images && req.files.images.length > 0) {
      galleryImages = req.files.images.map(file => `/uploads/${file.filename}`);
    }

    // Parse JSON fields if they're strings
    const processedInclusions = typeof inclusions === 'string' ? JSON.parse(inclusions) : inclusions;
    const processedExclusions = typeof exclusions === 'string' ? JSON.parse(exclusions) : exclusions;
    const processedItinerary = typeof itinerary === 'string' ? JSON.parse(itinerary) : itinerary;

    // Make sure required fields have valid values
    const validMaxGroupSize = parseInt(maxGroupSize) || parseInt(groupSize) || 10;
    const validPricePerPerson = parseFloat(pricePerPerson) || parseFloat(price) || 0;
    const validTourType = tourType || packageType || 'ADVENTURE';
    const validMinimumAge = parseInt(minimumAge) || 0;
    const validMaximumPeople = parseInt(maximumPeople) || validMaxGroupSize;
    
    console.log("Creating package with data:", {
      title, description, price, tourType, packageType, validTourType
    });

    // Create or connect destination if provided
    const destinationsData = [];
    if (destination) {
      // Check if a destination with this name already exists
      const existingDestination = await prisma.destination.findFirst({
        where: { name: destination }
      });
      
      if (existingDestination) {
        destinationsData.push({ id: existingDestination.id });
      } else {
        // Create a new destination
        const newDestination = await prisma.destination.create({
          data: {
            name: destination,
            description: `Destination for ${title}`
          }
        });
        destinationsData.push({ id: newDestination.id });
      }
    }
    
    // Create package with fields that match the Prisma schema
    const newPackage = await prisma.tourPackage.create({
      data: {
        title: Array.isArray(title) ? title[0] : title, 
        subtitle: subtitle || null,
        summary: summary || null,
        description,
        pricePerPerson: validPricePerPerson,
        // Use price field (optional) for discountPrice
        price: discountPrice ? parseFloat(discountPrice) : (discountedPrice ? parseFloat(discountedPrice) : null),
        duration: parseInt(duration) || 1,
        maxGroupSize: validMaxGroupSize,
        tourType: validTourType,
        // Include both destination field and destinations relation
        destination: destination || null, // Direct field for backward compatibility
        // Connect to destinations for proper relation
        destinations: destination ? {
          connect: destinationsData
        } : undefined,
        includedItems: processedInclusions || [],
        excludedItems: processedExclusions || [],
        highlights: [],
        itinerary: processedItinerary,
        status: status || 'DRAFT',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        phoneNumber,
        email,
        whatsapp,
        cancelationPolicy,
        additionalInfo,
        minimumAge: validMinimumAge,
        maximumPeople: validMaximumPeople,
        isFlexible: isFlexible === 'true' || isFlexible === true || false,
        difficultyLevel: difficultyLevel || null,
        coverImage,
        galleryImages: galleryImages || [],
        agency: {
          connect: {
            id: req.user.agencyId
          }
        },
        
        validFrom: validFrom ? new Date(validFrom) : null,
        validTill: validTill ? new Date(validTill) : null,


      }
    });

    // Invalidate cache for packages
    await cacheHelpers.clearPackageCache();
    // Also clear agency cache since package counts might change
    await cacheHelpers.clearAgencyCache(req.user.agencyId);
    
    res.status(201).json({
      message: 'Package created successfully',
      package: newPackage
    });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ message: 'Failed to create package', error: error.message });
  }
};

const updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, description, price, discountedPrice, duration, groupSize,
      packageType, destination, inclusions, exclusions, itinerary, status,
      startDate, endDate, removeCoverImage, removeGalleryImages
    } = req.body;

    // Check if package exists and belongs to the agency
    const existingPackage = await prisma.tourPackage.findFirst({
      where: {
        id,
        agencyId: req.user.agencyId
      }
    });

    if (!existingPackage) {
      return res.status(404).json({ 
        message: 'Package not found or you do not have permission to update this package' 
      });
    }

    // Process uploaded files
    const files = req.files || {};
    let coverImage = existingPackage.coverImage;
    let galleryImages = existingPackage.galleryImages || [];

    // Handle cover image
    if (files.coverImage) {
      coverImage = files.coverImage[0].path;
    } else if (removeCoverImage === 'true') {
      coverImage = null;
    }

    // Handle gallery images
    if (files.galleryImages) {
      const newGalleryImages = files.galleryImages.map(file => file.path);
      galleryImages = removeGalleryImages === 'true' 
        ? newGalleryImages 
        : [...galleryImages, ...newGalleryImages];
    } else if (removeGalleryImages === 'true') {
      galleryImages = [];
    }

    // Parse JSON fields if they're strings
    const parsedInclusions = typeof inclusions === 'string' ? JSON.parse(inclusions) : inclusions;
    const parsedExclusions = typeof exclusions === 'string' ? JSON.parse(exclusions) : exclusions;
    const parsedItinerary = typeof itinerary === 'string' ? JSON.parse(itinerary) : itinerary;

    // Handle destination updates
    let destinationUpdateData = {};
    if (destination) {
      // Check if this destination exists
      const existingDestination = await prisma.destination.findFirst({
        where: { name: destination }
      });
      
      if (existingDestination) {
        // Connect to the existing destination
        destinationUpdateData = {
          destination: destination, // Direct field for backward compatibility
          destinations: {
            set: [], // Clear existing connections
            connect: [{ id: existingDestination.id }]
          }
        };
      } else {
        // Create and connect to a new destination
        const newDestination = await prisma.destination.create({
          data: {
            name: destination,
            description: `Destination for ${title || existingPackage.title}`
          }
        });
        destinationUpdateData = {
          destination: destination, // Direct field for backward compatibility
          destinations: {
            set: [], // Clear existing connections
            connect: [{ id: newDestination.id }]
          }
        };
      }
    }

    // Update the package
    const updatedPackage = await prisma.tourPackage.update({
      where: { id },
      data: {
        title,
        description,
        price: price ? parseFloat(price) : undefined,
        discountedPrice: discountedPrice ? parseFloat(discountedPrice) : undefined,
        duration: duration ? parseInt(duration, 10) : undefined,
        groupSize: groupSize ? parseInt(groupSize, 10) : undefined,
        packageType,
        ...destinationUpdateData,
        inclusions: parsedInclusions,
        exclusions: parsedExclusions,
        itinerary: parsedItinerary,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        coverImage,
        galleryImages,
        updatedAt: new Date()
      }
    });

    // Invalidate cache for the updated package
    await cacheHelpers.clearPackageCache(id);
    // Also clear agency cache since package details might affect agency data
    await cacheHelpers.clearAgencyCache(req.user.agencyId);

    res.status(200).json({
      message: 'Package updated successfully',
      package: updatedPackage
    });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ message: 'Failed to update package', error: error.message });
  }
};

const deletePackage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if package exists and belongs to the agency
    const existingPackage = await prisma.tourPackage.findFirst({
      where: {
        id,
        agencyId: req.user.agencyId
      }
    });

    if (!existingPackage) {
      return res.status(404).json({ 
        message: 'Package not found or you do not have permission to delete this package' 
      });
    }

    // Check if package has any bookings
    const bookingsCount = await prisma.booking.count({
      where: {
        packageId: id,
        status: {
          notIn: ['CANCELLED', 'REFUNDED']
        }
      }
    });

    if (bookingsCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete package with active bookings. Cancel all bookings first or mark the package as inactive.' 
      });
    }

    // Delete the package
    await prisma.tourPackage.delete({
      where: { id }
    });

    // Invalidate cache for the deleted package
    await cacheHelpers.clearPackageCache(id);
    // Also clear agency cache since package counts will change
    await cacheHelpers.clearAgencyCache(req.user.agencyId);

    res.status(200).json({
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ message: 'Failed to delete package', error: error.message });
  }
};

// Bookings
const getBookings = async (req, res) => {
  try {
    const agencyId = req.user.agencyId;

    const bookings = await prisma.booking.findMany({
      where: { agencyId: agencyId }, 
    });

    res.json(bookings);
  } catch (error) {
    console.error('Error getting bookings:', error);
    res.status(500).json({ message: 'Failed to load bookings', error: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      agencyId: req.user.agencyId
    })
      .populate('packageId')
      .populate('userId', 'name email');

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    res.json(booking);
  } catch (error) {
    throw new ApiError(500, 'Error fetching booking');
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        agencyId: req.user.agencyId
      },
      { status: req.body.status },
      { new: true }
    );

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    res.json(booking);
  } catch (error) {
    throw new ApiError(500, 'Error updating booking status');
  }
};

// Payments
const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ agencyId: req.user.agencyId })
      .populate('bookingId')
      .populate('userId', 'name email');
    res.json(payments);
  } catch (error) {
    throw new ApiError(500, 'Error fetching payments');
  }
};

// Profile
const getProfile = async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'Agency ID not found for this user'
      });
    }
    
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        user: {
          select: {
            email: true,
            profileImage: true,
          }
        },
        verificationDocuments: {
          select: {
            id: true,
            name: true,
            documentUrl: true,
            documentType: true,
            uploadedAt: true,
            status: true
          }
        }
      }
    });
    
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agency not found'
      });
    }
    
    // Format the response
    const profileData = {
      id: agency.id,
      name: agency.name,
      description: agency.description,
      email: agency.user.email,
      phone: agency.phone,
      address: agency.address,
      city: agency.city,
      country: agency.country,
      website: agency.website,
      license: agency.licenseNumber,
      logo: agency.user.profileImage,
      coverImage: agency.coverImage,
      status: agency.status,
      createdAt: agency.createdAt,
      verificationDocuments: agency.verificationDocuments
    };
    
    return res.status(200).json({
      success: true,
      data: profileData
    });
  } catch (error) {
    console.error('Error fetching agency profile:', error);
    throw new ApiError(500, 'Error fetching agency profile');
  }
};

const updateProfile = async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { name, description, phone, address, city, country, website, license } = req.body;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'Agency ID not found for this user'
      });
    }
    
    // Handle file uploads if they exist
    let logoUrl = undefined;
    let coverImageUrl = undefined;
    
    if (req.files) {
      if (req.files.logo) {
        // Process logo file and get URL
        logoUrl = await uploadToStorage(req.files.logo[0]);
        
        // Update the user's profile image
        await prisma.user.update({
          where: { id: req.user.id },
          data: { profileImage: logoUrl }
        });
      }
      
      if (req.files.coverImage) {
        // Process cover image file and get URL
        coverImageUrl = await uploadToStorage(req.files.coverImage[0]);
      }
    }
    
    // Update agency profile
    const updatedAgency = await prisma.agency.update({
      where: { id: agencyId },
      data: {
        name: name,
        description: description,
        phone: phone,
        address: address,
        city: city,
        country: country,
        website: website,
        licenseNumber: license,
        coverImage: coverImageUrl,
        updatedAt: new Date()
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Agency profile updated successfully',
      data: {
        id: updatedAgency.id,
        name: updatedAgency.name,
        description: updatedAgency.description,
        phone: updatedAgency.phone,
        address: updatedAgency.address,
        city: updatedAgency.city,
        country: updatedAgency.country,
        website: updatedAgency.website,
        license: updatedAgency.licenseNumber,
        coverImage: updatedAgency.coverImage,
        logo: logoUrl // Return the updated logo URL if it was updated
      }
    });
  } catch (error) {
    console.error('Error updating agency profile:', error);
    throw new ApiError(500, 'Error updating agency profile');
  }
};

// Document Management
const getVerificationDocuments = async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'Agency ID not found for this user'
      });
    }
    
    const documents = await prisma.verificationDocument.findMany({
      where: { agencyId: agencyId },
      select: {
        id: true,
        name: true,
        documentUrl: true,
        documentType: true,
        uploadedAt: true,
        status: true
      },
      orderBy: { uploadedAt: 'desc' }
    });
    
    return res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error fetching verification documents:', error);
    throw new ApiError(500, 'Error fetching verification documents');
  }
};

const uploadVerificationDocument = async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { name, documentType } = req.body;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'Agency ID not found for this user'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Document file is required'
      });
    }
    
    // Upload file to storage and get URL
    const documentUrl = await uploadToStorage(req.file);
    
    // Create verification document record
    const document = await prisma.verificationDocument.create({
      data: {
        name,
        documentType,
        documentUrl,
        status: 'pending',
        uploadedAt: new Date(),
        agency: {
          connect: { id: agencyId }
        }
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        id: document.id,
        name: document.name,
        documentType: document.documentType,
        documentUrl: document.documentUrl,
        status: document.status,
        uploadedAt: document.uploadedAt
      }
    });
  } catch (error) {
    console.error('Error uploading verification document:', error);
    throw new ApiError(500, 'Error uploading verification document');
  }
};

const deleteVerificationDocument = async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { documentId } = req.params;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'Agency ID not found for this user'
      });
    }
    
    // Check if document exists and belongs to the agency
    const document = await prisma.verificationDocument.findFirst({
      where: {
        id: documentId,
        agencyId: agencyId
      }
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or you do not have permission to delete it'
      });
    }
    
    // Delete document from storage
    if (document.documentUrl) {
      await deleteFromStorage(document.documentUrl);
    }
    
    // Delete document record
    await prisma.verificationDocument.delete({
      where: { id: documentId }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting verification document:', error);
    throw new ApiError(500, 'Error deleting verification document');
  }
};

// Settings
const updateAgencySettings = async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { 
      notifyBookings, 
      notifyMessages, 
      notifyMarketing, 
      isPublic 
    } = req.body;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'Agency ID not found for this user'
      });
    }
    
    // Update agency settings
    const updatedSettings = await prisma.agencySettings.upsert({
      where: { agencyId },
      update: {
        notifyBookings,
        notifyMessages,
        notifyMarketing,
        isPublic,
        updatedAt: new Date()
      },
      create: {
        agencyId,
        notifyBookings: notifyBookings ?? true,
        notifyMessages: notifyMessages ?? true,
        notifyMarketing: notifyMarketing ?? false,
        isPublic: isPublic ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Agency settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error updating agency settings:', error);
    throw new ApiError(500, 'Error updating agency settings');
  }
};

const getAgencySettings = async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: 'Agency ID not found for this user'
      });
    }
    
    const settings = await prisma.agencySettings.findUnique({
      where: { agencyId }
    });
    
    // If no settings found, return default settings
    if (!settings) {
      return res.status(200).json({
        success: true,
        data: {
          notifyBookings: true,
          notifyMessages: true,
          notifyMarketing: false,
          isPublic: true
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching agency settings:', error);
    throw new ApiError(500, 'Error fetching agency settings');
  }
};

// Helper function for file uploads (implement based on your storage solution)
const uploadToStorage = async (file) => {
  // Implementation depends on your storage solution (e.g., AWS S3, Google Cloud Storage)
  // This is a placeholder - replace with your actual implementation
  return `https://storage.example.com/${file.filename}`;
};

// Helper function to delete files from storage
const deleteFromStorage = async (fileUrl) => {
  // Implementation depends on your storage solution
  // This is a placeholder - replace with your actual implementation
  console.log(`Deleting file: ${fileUrl}`);
  return true;
};

// Users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ agencyId: req.user.agencyId });
    res.json(users);
  } catch (error) {
    throw new ApiError(500, 'Error fetching users');
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      agencyId: req.user.agencyId
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json(user);
  } catch (error) {
    throw new ApiError(500, 'Error fetching user');
  }
};

const createUser = async (req, res) => {
  try {
    const user = new User({
      ...req.body,
      agencyId: req.user.agencyId
    });

    await user.save();
    res.status(201).json(user);
  } catch (error) {
    throw new ApiError(500, 'Error creating user');
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        agencyId: req.user.agencyId
      },
      req.body,
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json(user);
  } catch (error) {
    throw new ApiError(500, 'Error updating user');
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;

    // Check if user exists and belongs to this agency
    const user = await prisma.user.findFirst({
      where: {
        id,
        agencyId
      }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    throw new ApiError(500, 'Error deleting user');
  }
};

/**
 * Export a package as JSON data
 * @route GET /api/agency/packages/:id/export
 */
const exportPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const agencyId = req.user.agencyId;

    // Check if package exists and belongs to this agency
    const tourPackage = await prisma.tourPackage.findFirst({
      where: {
        id,
        agencyId
      },
      include: {
        agency: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        destinations: true,
        inclusions: true,
        exclusions: true,
        itinerary: {
          orderBy: {
            day: 'asc'
          }
        }
      }
    });

    if (!tourPackage) {
      return res.status(404).json({ message: 'Package not found or you do not have permission to access it' });
    }

    // Format data for export
    const exportData = {
      packageDetails: {
        title: tourPackage.title,
        description: tourPackage.description,
        summary: tourPackage.summary,
        price: tourPackage.price,
        duration: tourPackage.duration,
        priceType: tourPackage.priceType,
        minimumAge: tourPackage.minimumAge,
        maximumPeople: tourPackage.maximumPeople,
        startDate: tourPackage.startDate,
        endDate: tourPackage.endDate,
        isFlexible: tourPackage.isFlexible,
        status: tourPackage.status,
        difficultyLevel: tourPackage.difficultyLevel,
        cancelationPolicy: tourPackage.cancelationPolicy
      },
      agency: tourPackage.agency,
      destinations: tourPackage.destinations,
      inclusions: tourPackage.inclusions,
      exclusions: tourPackage.exclusions,
      itinerary: tourPackage.itinerary.map(day => ({
        day: day.day,
        title: day.title,
        description: day.description,
        meals: day.meals,
        accommodation: day.accommodation,
        activities: day.activities
      }))
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting package:', error);
    res.status(500).json({ message: 'Error exporting package' });
  }
};

// Redis Status and Cache Management
const getRedisCacheStatus = async (req, res) => {
  try {
    const redisStatus = await checkRedisStatus();
    
    res.status(200).json({
      success: true,
      data: redisStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking Redis status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking Redis cache status',
      error: error.message
    });
  }
};

// Function to manually clear package cache
const clearPackageCache = async (req, res) => {
  try {
    const { packageId } = req.params;
    const agencyId = req.user.agencyId;
    
    // If packageId is provided, clear only that package's cache
    if (packageId) {
      await cacheHelpers.clearPackageCache(packageId);
      console.log(`Cache cleared for package: ${packageId}`);
    } else {
      // Otherwise clear all package cache for this agency
      await cacheHelpers.clearPackageCache();
      await cacheHelpers.clearAgencyCache(agencyId);
      console.log(`Cache cleared for all packages from agency: ${agencyId}`);
    }
    
    res.status(200).json({
      success: true,
      message: packageId 
        ? `Cache cleared for package ${packageId}` 
        : 'Cache cleared for all packages',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing package cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing package cache',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardSummary,
  processBookingsForChart,
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  getBookings,
  getBookingById,
  updateBookingStatus,
  getPayments,
  getProfile,
  updateProfile,
  getVerificationDocuments,
  uploadVerificationDocument,
  deleteVerificationDocument,
  updateAgencySettings,
  getAgencySettings,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  exportPackage,
  getRedisCacheStatus,
  clearPackageCache
}; 