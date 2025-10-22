const postService = require('../services/post.service');

class AdvancedPostController {
  // Create a post collection
  async createCollection(req, res) {
    try {
      const { name, description, coverImage, isPublic } = req.body;
      const userId = req.user.id;

      const collection = await postService.createCollection(userId, {
        name,
        description,
        coverImage,
        isPublic
      });

      res.status(201).json({
        success: true,
        message: 'Collection created successfully',
        data: collection
      });
    } catch (error) {
      console.error('Error creating collection:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Add post to collection
  async addPostToCollection(req, res) {
    try {
      const { collectionId, postId } = req.body;
      const userId = req.user.id;

      const result = await postService.addPostToCollection(collectionId, postId, userId);

      res.json({
        success: true,
        message: 'Post added to collection',
        data: result
      });
    } catch (error) {
      console.error('Error adding post to collection:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user's collections
  async getUserCollections(req, res) {
    try {
      const userId = req.user.id;
      const { page, limit } = req.query;

      const collections = await postService.getUserCollections(userId, { page, limit });

      res.json({
        success: true,
        data: collections
      });
    } catch (error) {
      console.error('Error getting collections:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get trending posts
  async getTrendingPosts(req, res) {
    try {
      const { timeframe, limit } = req.query;

      const trendingPosts = await postService.getTrendingPosts({ timeframe, limit });

      res.json({
        success: true,
        data: trendingPosts
      });
    } catch (error) {
      console.error('Error getting trending posts:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get posts by hashtag
  async getPostsByHashtag(req, res) {
    try {
      const { hashtag } = req.params;
      const { page, limit } = req.query;

      const posts = await postService.getPostsByHashtag(hashtag, { page, limit });

      res.json({
        success: true,
        data: posts,
        hashtag: hashtag.startsWith('#') ? hashtag : `#${hashtag}`
      });
    } catch (error) {
      console.error('Error getting posts by hashtag:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get popular hashtags
  async getPopularHashtags(req, res) {
    try {
      const { limit, timeframe } = req.query;

      const hashtags = await postService.getPopularHashtags({ limit, timeframe });

      res.json({
        success: true,
        data: hashtags
      });
    } catch (error) {
      console.error('Error getting popular hashtags:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user profile posts
  async getUserPosts(req, res) {
    try {
      const { userId } = req.params;
      const { page, limit, type } = req.query;

      const posts = await postService.getUserPosts(userId, { page, limit, type });

      res.json({
        success: true,
        data: posts
      });
    } catch (error) {
      console.error('Error getting user posts:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Search posts
  async searchPosts(req, res) {
    try {
      const { q: query } = req.query;
      const { page, limit, type, agencyId, tourType } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      const filters = {};
      if (type) filters.type = type;
      if (agencyId) filters.agencyId = agencyId;
      if (tourType) filters.tourType = tourType;

      const posts = await postService.searchPosts(query.trim(), {
        page,
        limit,
        filters
      });

      res.json({
        success: true,
        data: posts,
        query: query.trim()
      });
    } catch (error) {
      console.error('Error searching posts:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get post analytics (for agencies)
  async getPostAnalytics(req, res) {
    try {
      const { agencyId } = req.params;
      const { startDate, endDate } = req.query;

      // Check if user has access to this agency's analytics
      if (req.user.role === 'AGENCY_ADMIN' || req.user.role === 'AGENCY_USER') {
        if (req.user.agencyId !== agencyId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      } else if (req.user.role !== 'SAFARWAY_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const analytics = await postService.getPostAnalytics(agencyId, {
        startDate,
        endDate
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting post analytics:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Toggle comment like
  async toggleCommentLike(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;

      const result = await postService.toggleCommentLike(commentId, userId);

      res.json({
        success: true,
        message: result.isLiked ? 'Comment liked' : 'Comment unliked',
        isLiked: result.isLiked
      });
    } catch (error) {
      console.error('Error toggling comment like:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user post statistics
  async getUserPostStats(req, res) {
    try {
      const { userId } = req.params;

      // Check if user can access these stats
      if (req.user.id !== userId && req.user.role !== 'SAFARWAY_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const stats = await postService.getUserPostStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting user post stats:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get posts for explore page
  async getExplorePosts(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user?.id;

      // Get a mix of trending and recent posts
      const [trendingPosts, recentPosts] = await Promise.all([
        postService.getTrendingPosts({ timeframe: '7d', limit: Math.floor(limit / 2) }),
        postService.searchPosts('', { 
          page, 
          limit: Math.ceil(limit / 2),
          filters: {} 
        })
      ]);

      // Merge and shuffle the results
      const explorePosts = [...trendingPosts, ...recentPosts]
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);

      res.json({
        success: true,
        data: explorePosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: explorePosts.length === parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error getting explore posts:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new AdvancedPostController();
