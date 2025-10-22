const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PostService {
  // Create a post collection (like Instagram albums)
  async createCollection(userId, { name, description, coverImage, isPublic = true }) {
    try {
      return await prisma.postCollection.create({
        data: {
          name,
          description,
          coverImage,
          isPublic,
          userId
        }
      });
    } catch (error) {
      throw new Error(`Failed to create collection: ${error.message}`);
    }
  }

  // Add post to collection
  async addPostToCollection(collectionId, postId, userId) {
    try {
      // Verify collection belongs to user
      const collection = await prisma.postCollection.findFirst({
        where: {
          id: collectionId,
          userId
        }
      });

      if (!collection) {
        throw new Error('Collection not found or access denied');
      }

      // Get the next order position
      const lastItem = await prisma.postCollectionItem.findFirst({
        where: { collectionId },
        orderBy: { order: 'desc' }
      });

      const nextOrder = lastItem ? lastItem.order + 1 : 0;

      return await prisma.postCollectionItem.create({
        data: {
          collectionId,
          postId,
          order: nextOrder
        }
      });
    } catch (error) {
      throw new Error(`Failed to add post to collection: ${error.message}`);
    }
  }

  // Get user's collections
  async getUserCollections(userId, { page = 1, limit = 20 } = {}) {
    try {
      const skip = (page - 1) * limit;

      return await prisma.postCollection.findMany({
        where: { userId },
        include: {
          posts: {
            take: 4, // Show first 4 posts as preview
            include: {
              post: {
                select: {
                  id: true,
                  mediaUrls: true,
                  type: true
                }
              }
            },
            orderBy: { order: 'asc' }
          },
          _count: {
            select: { posts: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      });
    } catch (error) {
      throw new Error(`Failed to get collections: ${error.message}`);
    }
  }

  // Get trending posts (based on engagement metrics)
  async getTrendingPosts({ timeframe = '7d', limit = 20 } = {}) {
    try {
      // Calculate date range
      const timeframeHours = {
        '1d': 24,
        '7d': 168,
        '30d': 720
      };

      const hoursAgo = timeframeHours[timeframe] || 168;
      const startDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));

      const trendingPosts = await prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          createdAt: {
            gte: startDate
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          agency: {
            select: {
              id: true,
              name: true,
              logo: true
            }
          },
          tourPackage: {
            select: {
              id: true,
              title: true,
              destination: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              saves: true,
              shares: true
            }
          }
        },
        take: limit * 2 // Get more to calculate engagement score
      });

      // Calculate engagement score and sort
      const postsWithScore = trendingPosts.map(post => {
        const ageInHours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
        const engagementScore = (
          (post._count.likes * 1) +
          (post._count.comments * 2) +
          (post._count.saves * 3) +
          (post._count.shares * 4) +
          (post.viewCount * 0.1)
        ) / Math.max(ageInHours, 1); // Time decay factor

        return {
          ...post,
          engagementScore
        };
      });

      return postsWithScore
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit);

    } catch (error) {
      throw new Error(`Failed to get trending posts: ${error.message}`);
    }
  }

  // Get posts by hashtag
  async getPostsByHashtag(hashtag, { page = 1, limit = 20 } = {}) {
    try {
      const skip = (page - 1) * limit;
      const normalizedHashtag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

      return await prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          hashtags: {
            some: {
              hashtag: normalizedHashtag
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          agency: {
            select: {
              id: true,
              name: true,
              logo: true
            }
          },
          tourPackage: {
            select: {
              id: true,
              title: true,
              destination: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              saves: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });
    } catch (error) {
      throw new Error(`Failed to get posts by hashtag: ${error.message}`);
    }
  }

  // Get popular hashtags
  async getPopularHashtags({ limit = 20, timeframe = '7d' } = {}) {
    try {
      const timeframeHours = {
        '1d': 24,
        '7d': 168,
        '30d': 720
      };

      const hoursAgo = timeframeHours[timeframe] || 168;
      const startDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));

      const hashtagCounts = await prisma.postHashtag.groupBy({
        by: ['hashtag'],
        where: {
          createdAt: {
            gte: startDate
          },
          post: {
            status: 'PUBLISHED'
          }
        },
        _count: {
          hashtag: true
        },
        orderBy: {
          _count: {
            hashtag: 'desc'
          }
        },
        take: limit
      });

      return hashtagCounts.map(item => ({
        hashtag: item.hashtag,
        count: item._count.hashtag
      }));
    } catch (error) {
      throw new Error(`Failed to get popular hashtags: ${error.message}`);
    }
  }

  // Get user profile posts
  async getUserPosts(userId, { page = 1, limit = 20, type } = {}) {
    try {
      const skip = (page - 1) * limit;
      let whereClause = {
        userId,
        status: 'PUBLISHED'
      };

      if (type) {
        whereClause.type = type;
      }

      return await prisma.post.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });
    } catch (error) {
      throw new Error(`Failed to get user posts: ${error.message}`);
    }
  }

  // Search posts
  async searchPosts(query, { page = 1, limit = 20, filters = {} } = {}) {
    try {
      const skip = (page - 1) * limit;
      let whereClause = {
        status: 'PUBLISHED',
        OR: [
          {
            caption: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            location: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            hashtags: {
              some: {
                hashtag: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            }
          },
          {
            tourPackage: {
              title: {
                contains: query,
                mode: 'insensitive'
              }
            }
          },
          {
            tourPackage: {
              destination: {
                contains: query,
                mode: 'insensitive'
              }
            }
          },
          {
            agency: {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            }
          }
        ]
      };

      // Apply filters
      if (filters.type) whereClause.type = filters.type;
      if (filters.agencyId) whereClause.agencyId = filters.agencyId;
      if (filters.tourType) {
        whereClause.tourPackage = {
          tourType: filters.tourType
        };
      }

      return await prisma.post.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          agency: {
            select: {
              id: true,
              name: true,
              logo: true
            }
          },
          tourPackage: {
            select: {
              id: true,
              title: true,
              destination: true,
              tourType: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              saves: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });
    } catch (error) {
      throw new Error(`Failed to search posts: ${error.message}`);
    }
  }

  // Get post analytics for agencies
  async getPostAnalytics(agencyId, { startDate, endDate } = {}) {
    try {
      const dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);

      const whereClause = {
        agencyId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      };

      // Get overall stats
      const [totalPosts, totalLikes, totalComments, totalShares, totalSaves] = await Promise.all([
        prisma.post.count({ where: whereClause }),
        prisma.postLike.count({
          where: {
            post: whereClause
          }
        }),
        prisma.postComment.count({
          where: {
            post: whereClause
          }
        }),
        prisma.postShare.count({
          where: {
            post: whereClause
          }
        }),
        prisma.postSave.count({
          where: {
            post: whereClause
          }
        })
      ]);

      // Get top performing posts
      const topPosts = await prisma.post.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              likes: true,
              comments: true,
              saves: true,
              shares: true
            }
          }
        },
        orderBy: [
          { viewCount: 'desc' }
        ],
        take: 10
      });

      // Get engagement by post type
      const engagementByType = await prisma.post.groupBy({
        by: ['type'],
        where: whereClause,
        _avg: {
          viewCount: true
        },
        _count: {
          id: true
        }
      });

      return {
        overview: {
          totalPosts,
          totalLikes,
          totalComments,
          totalShares,
          totalSaves,
          avgEngagement: totalPosts > 0 ? (totalLikes + totalComments + totalShares + totalSaves) / totalPosts : 0
        },
        topPosts,
        engagementByType
      };
    } catch (error) {
      throw new Error(`Failed to get post analytics: ${error.message}`);
    }
  }

  // Like a comment
  async toggleCommentLike(commentId, userId) {
    try {
      const existingLike = await prisma.postCommentLike.findUnique({
        where: {
          userId_commentId: {
            userId,
            commentId
          }
        }
      });

      if (existingLike) {
        await prisma.postCommentLike.delete({
          where: { id: existingLike.id }
        });
        return { isLiked: false };
      } else {
        await prisma.postCommentLike.create({
          data: {
            userId,
            commentId
          }
        });
        return { isLiked: true };
      }
    } catch (error) {
      throw new Error(`Failed to toggle comment like: ${error.message}`);
    }
  }

  // Get user's post statistics
  async getUserPostStats(userId) {
    try {
      const [totalPosts, totalLikes, totalComments, totalSaves] = await Promise.all([
        prisma.post.count({
          where: {
            userId,
            status: 'PUBLISHED'
          }
        }),
        prisma.postLike.count({
          where: {
            post: {
              userId,
              status: 'PUBLISHED'
            }
          }
        }),
        prisma.postComment.count({
          where: {
            post: {
              userId,
              status: 'PUBLISHED'
            }
          }
        }),
        prisma.postSave.count({
          where: {
            post: {
              userId,
              status: 'PUBLISHED'
            }
          }
        })
      ]);

      return {
        totalPosts,
        totalLikes,
        totalComments,
        totalSaves,
        avgLikesPerPost: totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0,
        avgCommentsPerPost: totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0
      };
    } catch (error) {
      throw new Error(`Failed to get user post stats: ${error.message}`);
    }
  }
}

module.exports = new PostService();
