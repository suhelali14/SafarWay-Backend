const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get agency public details including rating
 */
const getAgencyDetails = async (req, res) => {
  try {
    const { agencyId } = req.params;
    
    // Get agency details
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        id: true,
        name: true,
        description: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        logo: true,
        coverImage: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agency not found'
      });
    }
    
    // Get review stats
    const reviewStats = await prisma.review.aggregate({
      where: { agencyId },
      _count: { id: true },
      _avg: { rating: true }
    });
    
    // Check if user is subscribed (if authenticated)
    let isSubscribed = false;
    if (req.user) {
      const subscription = await prisma.subscription.findUnique({
        where: {
          userId_agencyId: {
            userId: req.user.id,
            agencyId
          }
        }
      });
      isSubscribed = !!subscription;
    }
    
    // Combine agency with review stats
    const agencyDetails = {
      ...agency,
      totalReviews: reviewStats._count.id || 0,
      averageRating: reviewStats._avg.rating || 0,
      isSubscribed
    };
    
    return res.status(200).json({
      success: true,
      data: agencyDetails
    });
  } catch (error) {
    console.error('Error fetching agency details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch agency details',
      error: error.message
    });
  }
};

/**
 * Get agency packages with filtering
 */
const getAgencyPackages = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter
    const where = { agencyId };
    if (status) {
      where.status = status;
    }
    
    // Get packages
    const packages = await prisma.tourPackage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });
    
    // Get total count for pagination
    const total = await prisma.tourPackage.count({ where });
    
    return res.status(200).json({
      success: true,
      data: packages,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching agency packages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch agency packages',
      error: error.message
    });
  }
};

/**
 * Get agency reviews with optional star filter
 */
const getAgencyReviews = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { rating, page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter
    const where = { agencyId };
    if (rating) {
      where.rating = parseInt(rating);
    }
    
    // Get reviews with user info
    const reviews = await prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });
    
    // Format reviews for response
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      userId: review.user.id,
      userName: review.user.name,
      userImage: review.user.profileImage,
      rating: review.rating,
      comment: review.comment,
      isVerifiedBooking: review.isVerifiedBooking,
      createdAt: review.createdAt,
      agencyResponse: review.responseText ? {
        response: review.responseText,
        respondedAt: review.responseDate
      } : null
    }));
    
    // Get total count for pagination
    const total = await prisma.review.count({ where });
    
    return res.status(200).json({
      success: true,
      data: formattedReviews,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching agency reviews:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch agency reviews',
      error: error.message
    });
  }
};

/**
 * Get agency media (Instagram-like wall)
 */
const getAgencyMedia = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { page = 1, limit = 12 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get media items
    const mediaItems = await prisma.agencyMedia.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });
    
    // Check if user has liked the media items (if authenticated)
    let formattedMediaItems = [...mediaItems];
    
    if (req.user) {
      // Get all likes for this user for the fetched media items
      const mediaIds = mediaItems.map(item => item.id);
      
      const userLikes = await prisma.mediaLike.findMany({
        where: {
          userId: req.user.id,
          mediaId: { in: mediaIds }
        }
      });
      
      // Map of liked media IDs
      const likedMediaMap = userLikes.reduce((map, like) => {
        map[like.mediaId] = true;
        return map;
      }, {});
      
      // Add hasUserLiked flag to each media item
      formattedMediaItems = mediaItems.map(item => ({
        ...item,
        hasUserLiked: !!likedMediaMap[item.id]
      }));
    } else {
      // Just add hasUserLiked flag as false if user not authenticated
      formattedMediaItems = mediaItems.map(item => ({
        ...item,
        hasUserLiked: false
      }));
    }
    
    // Get total count for pagination
    const total = await prisma.agencyMedia.count({ where: { agencyId } });
    
    return res.status(200).json({
      success: true,
      data: formattedMediaItems,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching agency media:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch agency media',
      error: error.message
    });
  }
};

/**
 * Subscribe to agency updates
 */
const subscribeToAgency = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const userId = req.user.id;
    
    // Check if agency exists
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId }
    });
    
    if (!agency) {
      return res.status(404).json({
        success: false,
        message: 'Agency not found'
      });
    }
    
    // Check if already subscribed
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId_agencyId: {
          userId,
          agencyId
        }
      }
    });
    
    if (existingSubscription) {
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to this agency'
      });
    }
    
    // Create new subscription
    await prisma.subscription.create({
      data: {
        userId,
        agencyId,
        subscribedAt: new Date()
      }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Successfully subscribed to agency updates'
    });
  } catch (error) {
    console.error('Error subscribing to agency:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to agency updates',
      error: error.message
    });
  }
};

/**
 * Unsubscribe from agency updates
 */
const unsubscribeFromAgency = async (req, res) => {
  try {
    const { agencyId } = req.params;
    const userId = req.user.id;
    
    // Delete subscription
    const result = await prisma.subscription.deleteMany({
      where: {
        userId,
        agencyId
      }
    });
    
    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: 'You are not subscribed to this agency'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from agency updates'
    });
  } catch (error) {
    console.error('Error unsubscribing from agency:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from agency updates',
      error: error.message
    });
  }
};

/**
 * Like agency media item
 */
const likeMediaItem = async (req, res) => {
  try {
    const { agencyId, mediaId } = req.params;
    const userId = req.user.id;
    
    // Check if media exists
    const media = await prisma.agencyMedia.findFirst({
      where: {
        id: mediaId,
        agencyId
      }
    });
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }
    
    // Check if already liked
    const existingLike = await prisma.mediaLike.findUnique({
      where: {
        userId_mediaId: {
          userId,
          mediaId
        }
      }
    });
    
    if (existingLike) {
      return res.status(200).json({
        success: true,
        message: 'You already liked this media',
        likes: media.likes
      });
    }
    
    // Create new like in a transaction
    const updatedMedia = await prisma.$transaction(async (tx) => {
      // Create like
      await tx.mediaLike.create({
        data: {
          userId,
          mediaId,
          likedAt: new Date()
        }
      });
      
      // Increment likes count
      return tx.agencyMedia.update({
        where: { id: mediaId },
        data: { likes: { increment: 1 } }
      });
    });
    
    return res.status(200).json({
      success: true,
      message: 'Media liked successfully',
      likes: updatedMedia.likes
    });
  } catch (error) {
    console.error('Error liking media item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to like media item',
      error: error.message
    });
  }
};

/**
 * Unlike agency media item
 */
const unlikeMediaItem = async (req, res) => {
  try {
    const { agencyId, mediaId } = req.params;
    const userId = req.user.id;
    
    // Check if media exists
    const media = await prisma.agencyMedia.findFirst({
      where: {
        id: mediaId,
        agencyId
      }
    });
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }
    
    // Delete like in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete the like
      const deletedLike = await tx.mediaLike.deleteMany({
        where: {
          userId,
          mediaId
        }
      });
      
      if (deletedLike.count === 0) {
        return { deleted: false, media };
      }
      
      // Decrement likes count
      const updatedMedia = await tx.agencyMedia.update({
        where: { id: mediaId },
        data: { 
          likes: {
            decrement: media.likes > 0 ? 1 : 0
          }
        }
      });
      
      return { deleted: true, media: updatedMedia };
    });
    
    if (!result.deleted) {
      return res.status(400).json({
        success: false,
        message: 'You have not liked this media',
        likes: media.likes
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Media unliked successfully',
      likes: result.media.likes
    });
  } catch (error) {
    console.error('Error unliking media item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unlike media item',
      error: error.message
    });
  }
};

module.exports = {
  getAgencyDetails,
  getAgencyPackages,
  getAgencyReviews,
  getAgencyMedia,
  subscribeToAgency,
  unsubscribeFromAgency,
  likeMediaItem,
  unlikeMediaItem
}; 