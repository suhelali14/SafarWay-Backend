const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const advancedPostController = require('../controllers/advancedPost.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validatePost, validateComment, validateReport, validateFeedFilters } = require('../validators/post.validator');

// Public routes
router.get('/feed', validateFeedFilters, (req, res) => postController.getFeed(req, res));
router.get('/comments/:postId', (req, res) => postController.getComments(req, res));
router.get('/trending', (req, res) => advancedPostController.getTrendingPosts(req, res));
router.get('/hashtag/:hashtag', (req, res) => advancedPostController.getPostsByHashtag(req, res));
router.get('/hashtags/popular', (req, res) => advancedPostController.getPopularHashtags(req, res));
router.get('/search', (req, res) => advancedPostController.searchPosts(req, res));
router.get('/explore', (req, res) => advancedPostController.getExplorePosts(req, res));
router.get('/user/:userId', (req, res) => advancedPostController.getUserPosts(req, res));
router.get('/user/:userId/stats', (req, res) => advancedPostController.getUserPostStats(req, res));

// Protected routes (require authentication)
router.use(authenticate);

// Post management
router.post('/', validatePost, (req, res) => postController.createPost(req, res));
router.get('/eligible-bookings', (req, res) => postController.getEligibleBookings(req, res));
router.get('/saved', (req, res) => postController.getSavedPosts(req, res));

// Post interactions
router.post('/:postId/like', (req, res) => postController.toggleLike(req, res));
router.post('/:postId/save', (req, res) => postController.toggleSave(req, res));
router.post('/:postId/share', (req, res) => postController.sharePost(req, res));
router.post('/:postId/report', validateReport, (req, res) => postController.reportPost(req, res));

// Comments
router.post('/:postId/comments', validateComment, (req, res) => postController.addComment(req, res));
router.post('/comments/:commentId/like', (req, res) => advancedPostController.toggleCommentLike(req, res));

// Collections
router.post('/collections', (req, res) => advancedPostController.createCollection(req, res));
router.post('/collections/add-post', (req, res) => advancedPostController.addPostToCollection(req, res));
router.get('/collections', (req, res) => advancedPostController.getUserCollections(req, res));

// Analytics (for agencies and admins)
router.get('/analytics/:agencyId', (req, res) => advancedPostController.getPostAnalytics(req, res));

module.exports = router;
