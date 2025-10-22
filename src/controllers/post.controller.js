const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const postService = require('../services/post.service');
const postNotificationService = require('../services/postNotification.service');

class PostController {
  // Create a new post (with business logic validation)
  async createPost(req, res) {
    try {
      const { 
        type, 
        caption, 
        mediaUrls, 
        thumbnailUrl, 
        duration, 
        location, 
        bookingId, 
        agencyId, 
        tourPackageId,
        hashtags = [],
        taggedUsers = []
      } = req.body;
      
      const userId = req.user.id;

      // Validate if user can post about this trip
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          userId: userId,
          agencyId: agencyId,
          tourPackageId: tourPackageId,
          status: 'COMPLETED'
        },
        include: {
          tourPackage: true
        }
      });

      if (!booking) {
        return res.status(403).json({
          success: false,
          message: 'You can only post about completed trips you have booked'
        });
      }

      // Check if the trip has actually ended
      const currentDate = new Date();
      const tripEndDate = booking.endDate || booking.startDate;
      
      if (tripEndDate > currentDate) {
        return res.status(403).json({
          success: false,
          message: 'You can only post after your trip has been completed'
        });
      }

      // Create the post
      const post = await prisma.post.create({
        data: {
          type,
          caption,
          mediaUrls,
          thumbnailUrl,
          duration,
          location,
          userId,
          agencyId,
          tourPackageId,
          bookingId,
          isEligible: true,
          tripCompleted: true,
          isVerified: true // Auto-verify since we validated the booking
        }
      });

      // Add hashtags
      if (hashtags.length > 0) {
        await prisma.postHashtag.createMany({
          data: hashtags.map(hashtag => ({
            postId: post.id,
            hashtag: hashtag.startsWith('#') ? hashtag : `#${hashtag}`
          }))
        });
      }

      // Add tagged users
      if (taggedUsers.length > 0) {
        await prisma.postTag.createMany({
          data: taggedUsers.map(userId => ({
            postId: post.id,
            userId
          }))
        });

        // Send notifications to tagged users
        for (const taggedUserId of taggedUsers) {
          await postNotificationService.notifyUserTag(post.id, taggedUserId, userId);
        }
      }

      // Get the complete post with relations
      const completePost = await this.getPostById(post.id);

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: completePost
      });

    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create post',
        error: error.message
      });
    }
  }

  // Get posts feed (Instagram-like timeline)
  async getFeed(req, res) {
    try {
      const userId = req.user?.id;
      const { 
        page = 1, 
        limit = 10, 
        type, 
        agencyId, 
        tourPackageId,
        following = false 
      } = req.query;

      const skip = (page - 1) * limit;
      const take = parseInt(limit);

      let whereClause = {
        status: 'PUBLISHED'
      };

      if (type) whereClause.type = type;
      if (agencyId) whereClause.agencyId = agencyId;
      if (tourPackageId) whereClause.tourPackageId = tourPackageId;

      // If following is true and user is logged in, show posts from subscribed agencies
      if (following && userId) {
        const subscriptions = await prisma.subscription.findMany({
          where: { userId },
          select: { agencyId: true }
        });
        
        whereClause.agencyId = {
          in: subscriptions.map(sub => sub.agencyId)
        };
      }

      const posts = await prisma.post.findMany({
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
              logo: true,
              status: true
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
          likes: {
            where: userId ? { userId } : undefined,
            select: { id: true }
          },
          saves: {
            where: userId ? { userId } : undefined,
            select: { id: true }
          },
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true
                }
              },
              _count: {
                select: { likes: true }
              }
            }
          },
          hashtags: true,
          tags: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true
                }
              }
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
        orderBy: [
          { createdAt: 'desc' }
        ],
        skip,
        take
      });

      // Track views for logged in users
      if (userId && posts.length > 0) {
        await this.trackPostViews(posts.map(p => p.id), userId, req.ip, req.get('User-Agent'));
      }

      const postsWithInteractions = posts.map(post => ({
        ...post,
        isLiked: post.likes.length > 0,
        isSaved: post.saves.length > 0,
        likes: post._count.likes,
        commentsCount: post._count.comments,
        savesCount: post._count.saves,
        sharesCount: post._count.shares
      }));

      res.json({
        success: true,
        data: postsWithInteractions,
        pagination: {
          page: parseInt(page),
          limit: take,
          hasMore: posts.length === take
        }
      });

    } catch (error) {
      console.error('Error getting feed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get feed',
        error: error.message
      });
    }
  }

  // Like/Unlike a post
  async toggleLike(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.id;

      const existingLike = await prisma.postLike.findUnique({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });

      if (existingLike) {
        // Unlike the post
        await prisma.postLike.delete({
          where: { id: existingLike.id }
        });

        res.json({
          success: true,
          message: 'Post unliked',
          isLiked: false
        });
      } else {
        // Like the post
        await prisma.postLike.create({
          data: {
            userId,
            postId
          }
        });

        // Send notification to post owner
        await postNotificationService.notifyPostLike(postId, userId);

        // Check for milestones
        const likeCount = await prisma.postLike.count({
          where: { postId }
        });

        if (likeCount === 1) {
          await postNotificationService.notifyPostMilestone(postId, 'FIRST_LIKE');
        } else if (likeCount === 10) {
          await postNotificationService.notifyPostMilestone(postId, 'TEN_LIKES');
        } else if (likeCount === 100) {
          await postNotificationService.notifyPostMilestone(postId, 'HUNDRED_LIKES');
        } else if (likeCount >= 1000) {
          await postNotificationService.notifyPostMilestone(postId, 'VIRAL');
        }

        res.json({
          success: true,
          message: 'Post liked',
          isLiked: true
        });
      }

    } catch (error) {
      console.error('Error toggling like:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle like',
        error: error.message
      });
    }
  }

  // Save/Unsave a post
  async toggleSave(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user.id;

      const existingSave = await prisma.postSave.findUnique({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });

      if (existingSave) {
        // Unsave the post
        await prisma.postSave.delete({
          where: { id: existingSave.id }
        });

        res.json({
          success: true,
          message: 'Post unsaved',
          isSaved: false
        });
      } else {
        // Save the post
        await prisma.postSave.create({
          data: {
            userId,
            postId
          }
        });

        res.json({
          success: true,
          message: 'Post saved',
          isSaved: true
        });
      }

    } catch (error) {
      console.error('Error toggling save:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle save',
        error: error.message
      });
    }
  }

  // Add comment to a post
  async addComment(req, res) {
    try {
      const { postId } = req.params;
      const { content, parentCommentId } = req.body;
      const userId = req.user.id;

      // Validate post exists and is published
      const post = await prisma.post.findFirst({
        where: {
          id: postId,
          status: 'PUBLISHED'
        }
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found or not available'
        });
      }

      // If it's a reply, validate parent comment exists
      if (parentCommentId) {
        const parentComment = await prisma.postComment.findFirst({
          where: {
            id: parentCommentId,
            postId: postId,
            status: 'ACTIVE'
          }
        });

        if (!parentComment) {
          return res.status(404).json({
            success: false,
            message: 'Parent comment not found'
          });
        }
      }

      const comment = await prisma.postComment.create({
        data: {
          content,
          userId,
          postId,
          parentCommentId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          _count: {
            select: {
              likes: true,
              replies: true
            }
          }
        }
      });

      // Send notification to post owner or parent comment owner
      await postNotificationService.notifyPostComment(postId, comment.id, userId);

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        data: comment
      });

    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add comment',
        error: error.message
      });
    }
  }

  // Get comments for a post
  async getComments(req, res) {
    try {
      const { postId } = req.params;
      const { page = 1, limit = 20, parentCommentId } = req.query;
      const userId = req.user?.id;

      const skip = (page - 1) * limit;
      const take = parseInt(limit);

      let whereClause = {
        postId,
        status: 'ACTIVE'
      };

      // Get main comments or replies
      if (parentCommentId) {
        whereClause.parentCommentId = parentCommentId;
      } else {
        whereClause.parentCommentId = null;
      }

      const comments = await prisma.postComment.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true
            }
          },
          likes: {
            where: userId ? { userId } : undefined,
            select: { id: true }
          },
          _count: {
            select: {
              likes: true,
              replies: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take
      });

      const commentsWithInteractions = comments.map(comment => ({
        ...comment,
        isLiked: comment.likes.length > 0,
        likesCount: comment._count.likes,
        repliesCount: comment._count.replies
      }));

      res.json({
        success: true,
        data: commentsWithInteractions,
        pagination: {
          page: parseInt(page),
          limit: take,
          hasMore: comments.length === take
        }
      });

    } catch (error) {
      console.error('Error getting comments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get comments',
        error: error.message
      });
    }
  }

  // Share a post
  async sharePost(req, res) {
    try {
      const { postId } = req.params;
      const { platform } = req.body;
      const userId = req.user.id;

      // Validate post exists
      const post = await prisma.post.findFirst({
        where: {
          id: postId,
          status: 'PUBLISHED'
        }
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Record the share
      await prisma.postShare.create({
        data: {
          userId,
          postId,
          platform
        }
      });

      // Increment share count
      await prisma.post.update({
        where: { id: postId },
        data: {
          shareCount: {
            increment: 1
          }
        }
      });

      // Send notification to post owner
      await postNotificationService.notifyPostShare(postId, userId, platform);

      res.json({
        success: true,
        message: 'Post shared successfully'
      });

    } catch (error) {
      console.error('Error sharing post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to share post',
        error: error.message
      });
    }
  }

  // Report a post
  async reportPost(req, res) {
    try {
      const { postId } = req.params;
      const { reason, description } = req.body;
      const userId = req.user.id;

      // Check if user already reported this post
      const existingReport = await prisma.postReport.findFirst({
        where: {
          userId,
          postId
        }
      });

      if (existingReport) {
        return res.status(400).json({
          success: false,
          message: 'You have already reported this post'
        });
      }

      await prisma.postReport.create({
        data: {
          userId,
          postId,
          reason,
          description
        }
      });

      res.json({
        success: true,
        message: 'Post reported successfully. We will review it soon.'
      });

    } catch (error) {
      console.error('Error reporting post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to report post',
        error: error.message
      });
    }
  }

  // Get user's eligible bookings for posting
  async getEligibleBookings(req, res) {
    try {
      const userId = req.user.id;
      const currentDate = new Date();

      const eligibleBookings = await prisma.booking.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          OR: [
            { endDate: { lte: currentDate } },
            { 
              AND: [
                { endDate: null },
                { startDate: { lte: currentDate } }
              ]
            }
          ]
        },
        include: {
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
              coverImage: true
            }
          },
          _count: {
            select: {
              posts: true
            }
          }
        },
        orderBy: { startDate: 'desc' }
      });

      res.json({
        success: true,
        data: eligibleBookings.map(booking => ({
          ...booking,
          hasPosted: booking._count.posts > 0
        }))
      });

    } catch (error) {
      console.error('Error getting eligible bookings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get eligible bookings',
        error: error.message
      });
    }
  }

  // Get user's saved posts
  async getSavedPosts(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;
      const take = parseInt(limit);

      const savedPosts = await prisma.postSave.findMany({
        where: { userId },
        include: {
          post: {
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
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      });

      res.json({
        success: true,
        data: savedPosts.map(save => save.post),
        pagination: {
          page: parseInt(page),
          limit: take,
          hasMore: savedPosts.length === take
        }
      });

    } catch (error) {
      console.error('Error getting saved posts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get saved posts',
        error: error.message
      });
    }
  }

  // Helper method to get a complete post by ID
  async getPostById(postId) {
    return await prisma.post.findUnique({
      where: { id: postId },
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
        hashtags: true,
        tags: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true
              }
            }
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
      }
    });
  }

  // Helper method to track post views
  async trackPostViews(postIds, userId = null, ipAddress = null, userAgent = null) {
    try {
      const viewData = postIds.map(postId => ({
        postId,
        userId,
        ipAddress,
        userAgent
      }));

      await prisma.postView.createMany({
        data: viewData,
        skipDuplicates: true
      });

      // Update view counts
      await prisma.post.updateMany({
        where: {
          id: { in: postIds }
        },
        data: {
          viewCount: {
            increment: 1
          }
        }
      });
    } catch (error) {
      console.error('Error tracking post views:', error);
    }
  }
}

module.exports = new PostController();
