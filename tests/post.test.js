const request = require('supertest');
const app = require('../src/server');

describe('Post System API Tests', () => {
  let authToken;
  let testUserId;
  let testAgencyId;
  let testTourPackageId;
  let testBookingId;
  let testPostId;

  beforeAll(async () => {
    // Setup test data - you would need to create test users, agencies, bookings etc.
    // This is a simplified example
    
    // Mock authentication token
    authToken = 'mock-jwt-token';
    testUserId = 'test-user-id';
    testAgencyId = 'test-agency-id';
    testTourPackageId = 'test-tour-package-id';
    testBookingId = 'test-booking-id';
  });

  describe('POST /api/posts', () => {
    it('should create a new post for completed trip', async () => {
      const postData = {
        type: 'PHOTO',
        caption: 'Amazing trip to Kerala backwaters! #kerala #backwaters #amazing',
        mediaUrls: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg'
        ],
        location: 'Alleppey, Kerala',
        bookingId: testBookingId,
        agencyId: testAgencyId,
        tourPackageId: testTourPackageId,
        hashtags: ['kerala', 'backwaters', 'amazing'],
        taggedUsers: []
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('PHOTO');
      expect(response.body.data.caption).toBe(postData.caption);
      
      testPostId = response.body.data.id;
    });

    it('should reject post for non-completed trip', async () => {
      const postData = {
        type: 'PHOTO',
        caption: 'Trying to post about future trip',
        mediaUrls: ['https://example.com/image.jpg'],
        bookingId: 'non-completed-booking-id',
        agencyId: testAgencyId,
        tourPackageId: testTourPackageId
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('completed trips');
    });
  });

  describe('GET /api/posts/feed', () => {
    it('should return paginated posts feed', async () => {
      const response = await request(app)
        .get('/api/posts/feed?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should filter posts by type', async () => {
      const response = await request(app)
        .get('/api/posts/feed?type=PHOTO')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach(post => {
        expect(post.type).toBe('PHOTO');
      });
    });
  });

  describe('POST /api/posts/:postId/like', () => {
    it('should like a post', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isLiked).toBe(true);
      expect(response.body.message).toContain('liked');
    });

    it('should unlike a post when called again', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isLiked).toBe(false);
      expect(response.body.message).toContain('unliked');
    });
  });

  describe('POST /api/posts/:postId/comments', () => {
    it('should add a comment to a post', async () => {
      const commentData = {
        content: 'This looks absolutely amazing! How was the experience?'
      };

      const response = await request(app)
        .post(`/api/posts/${testPostId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.content).toBe(commentData.content);
    });
  });

  describe('GET /api/posts/eligible-bookings', () => {
    it('should return eligible bookings for posting', async () => {
      const response = await request(app)
        .get('/api/posts/eligible-bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        const booking = response.body.data[0];
        expect(booking).toHaveProperty('id');
        expect(booking).toHaveProperty('agency');
        expect(booking).toHaveProperty('tourPackage');
        expect(booking).toHaveProperty('hasPosted');
      }
    });
  });

  describe('GET /api/posts/trending', () => {
    it('should return trending posts', async () => {
      const response = await request(app)
        .get('/api/posts/trending?timeframe=7d&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        const post = response.body.data[0];
        expect(post).toHaveProperty('engagementScore');
        expect(post.engagementScore).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('GET /api/posts/search', () => {
    it('should search posts by query', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=kerala&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.query).toBe('kerala');
    });

    it('should reject short search queries', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=k')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('at least 2 characters');
    });
  });

  describe('GET /api/posts/hashtag/:hashtag', () => {
    it('should return posts with specific hashtag', async () => {
      const response = await request(app)
        .get('/api/posts/hashtag/kerala')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.hashtag).toBe('#kerala');
    });
  });

  describe('POST /api/posts/:postId/save', () => {
    it('should save a post', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPostId}/save`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isSaved).toBe(true);
    });
  });

  describe('GET /api/posts/saved', () => {
    it('should return saved posts', async () => {
      const response = await request(app)
        .get('/api/posts/saved')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/posts/:postId/report', () => {
    it('should report a post', async () => {
      const reportData = {
        reason: 'SPAM',
        description: 'This post appears to be spam'
      };

      const response = await request(app)
        .post(`/api/posts/${testPostId}/report`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reported');
    });
  });

  describe('Validation Tests', () => {
    it('should validate post data', async () => {
      const invalidPostData = {
        type: 'INVALID_TYPE',
        caption: 'A'.repeat(2001), // Too long
        mediaUrls: [], // Empty array
        bookingId: 'invalid-uuid'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPostData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });
});

// Helper function to setup test data
async function setupTestData() {
  // This would create test users, agencies, tour packages, and completed bookings
  // Implementation depends on your test database setup
  console.log('Setting up test data...');
}

// Helper function to cleanup test data
async function cleanupTestData() {
  // This would remove test data after tests complete
  console.log('Cleaning up test data...');
}

module.exports = {
  setupTestData,
  cleanupTestData
};
