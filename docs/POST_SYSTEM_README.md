# 📸 SafarWay Post System - Instagram-like Travel Experience Sharing

## 🌟 Overview

The SafarWay Post System is a comprehensive, scalable social media feature that allows users to share their travel experiences through photos and reels, similar to Instagram. The system enforces business logic to ensure authenticity - users can only post about trips they have actually completed.

## ✨ Key Features

### 🔐 Smart Business Logic
- **Trip Verification**: Users can only post about completed bookings
- **Date Validation**: Posts allowed only after trip end date
- **Agency Tagging**: Automatic tagging of the agency and tour package
- **Authentic Reviews**: No fake posts possible due to booking verification

### 📱 Instagram-like Experience
- **Multiple Post Types**: Photos, Reels, and Carousel posts
- **Rich Interactions**: Likes, comments, saves, shares
- **Hashtag System**: Trending hashtags and discovery
- **User Tagging**: Tag friends in posts
- **Collections**: Create albums of posts
- **Real-time Notifications**: Push notifications for all interactions

### 🚀 Scalable Architecture
- **Optimized Database**: Proper indexing and constraints
- **Efficient Queries**: Pagination and smart data fetching
- **Caching Ready**: Built with caching in mind
- **Analytics**: Comprehensive post and engagement analytics
- **Moderation Tools**: Reporting and content moderation

## 📋 Business Rules

### Eligibility Criteria
1. **User must have a COMPLETED booking** with the agency
2. **Trip must be finished** (end date < current date)
3. **Booking must be verified** and paid
4. **User can create multiple posts** per completed trip

### Content Guidelines
- Maximum 10 media files per post
- Reels: Maximum 5 minutes duration
- Captions: Maximum 2000 characters
- Hashtags: Maximum 20 per post
- User Tags: Maximum 30 per post

## 🏗️ Database Schema

### Core Models

#### Post
```sql
- id (UUID, Primary Key)
- type (PHOTO|REEL|CAROUSEL)
- caption (Text, Optional)
- mediaUrls (String Array)
- thumbnailUrl (String, for reels)
- duration (Integer, for reels)
- location (String, Optional)
- status (PUBLISHED|DRAFT|ARCHIVED|HIDDEN|REPORTED)
- isVerified (Boolean, auto-verified for completed trips)
- viewCount, shareCount (Integers)
- isEligible, tripCompleted (Boolean, business logic)
- userId, agencyId, tourPackageId, bookingId (Foreign Keys)
- createdAt, updatedAt (Timestamps)
```

#### Interaction Models
- **PostLike**: Like tracking with user and timestamp
- **PostComment**: Nested comments with replies support
- **PostSave**: Saved posts for users
- **PostShare**: Share tracking with platform info
- **PostTag**: User tagging in posts
- **PostHashtag**: Hashtag tracking and trending
- **PostView**: View analytics and tracking
- **PostReport**: Content moderation and reporting

### Advanced Features
- **PostCollection**: Instagram-like albums
- **PostAnalytics**: Comprehensive engagement metrics
- **PostNotifications**: Real-time interaction alerts

## 🔌 API Endpoints

### Authentication Required 🔒
Most endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

### Core Endpoints

#### Post Management
```http
POST /api/posts                    # Create new post
GET  /api/posts/feed               # Get posts feed
GET  /api/posts/eligible-bookings  # Get eligible trips for posting
GET  /api/posts/saved              # Get user's saved posts
```

#### Interactions
```http
POST /api/posts/:id/like          # Like/unlike post
POST /api/posts/:id/save          # Save/unsave post
POST /api/posts/:id/share         # Share post
POST /api/posts/:id/comments      # Add comment
POST /api/posts/:id/report        # Report post
```

#### Discovery
```http
GET /api/posts/trending           # Get trending posts
GET /api/posts/search            # Search posts
GET /api/posts/hashtag/:hashtag  # Posts by hashtag
GET /api/posts/user/:userId      # User's posts
```

#### Advanced Features
```http
POST /api/posts/collections      # Create post collection
GET  /api/posts/collections      # Get user collections
GET  /api/posts/analytics/:agencyId  # Analytics for agencies
```

## 📱 Frontend Integration Examples

### Creating a Post
```javascript
const createPost = async (postData) => {
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'PHOTO',
      caption: 'Amazing trip to Kerala! #kerala #backwaters',
      mediaUrls: ['https://example.com/image1.jpg'],
      location: 'Alleppey, Kerala',
      bookingId: 'completed-booking-uuid',
      agencyId: 'agency-uuid',
      tourPackageId: 'package-uuid',
      hashtags: ['kerala', 'backwaters', 'amazing'],
      taggedUsers: ['friend-user-uuid']
    })
  });
  
  return response.json();
};
```

### Getting Feed
```javascript
const getFeed = async (page = 1, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '10',
    ...filters
  });
  
  const response = await fetch(`/api/posts/feed?${params}`);
  return response.json();
};
```

### Liking a Post
```javascript
const toggleLike = async (postId) => {
  const response = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });
  
  return response.json();
};
```

## 🛠️ Setup Instructions

### 1. Database Migration
```bash
# Run the Prisma migration
npx prisma migrate dev --name add_post_system

# Generate Prisma client
npx prisma generate
```

### 2. Run Optimization Script
```bash
# Apply database optimizations
psql -d your_database -f prisma/migrations/post_system_optimization.sql
```

### 3. Environment Variables
```env
# Add to your .env file
ENABLE_POST_NOTIFICATIONS=true
PUSH_NOTIFICATION_SERVICE=firebase  # or your preferred service
FCM_SERVER_KEY=your_firebase_server_key
```

### 4. Install Dependencies
```bash
npm install express-validator
# Add any additional dependencies for push notifications
```

## 📊 Analytics & Monitoring

### Available Metrics
- **Post Performance**: Views, likes, comments, shares, saves
- **User Engagement**: Average engagement per post
- **Trending Content**: Hashtag popularity, viral posts
- **Agency Analytics**: Performance by agency and tour type
- **User Statistics**: Personal post metrics

### Analytics Endpoints
```http
GET /api/posts/analytics/:agencyId     # Agency performance
GET /api/posts/user/:userId/stats      # User statistics
GET /api/posts/hashtags/popular        # Trending hashtags
```

## 🔔 Notification System

### Supported Notifications
- **Post Interactions**: Likes, comments, shares
- **User Tagging**: When tagged in posts
- **Milestones**: First like, 10 likes, 100 likes, viral posts
- **Trending Content**: For agency subscribers

### Push Notification Integration
The system is designed to work with Firebase Cloud Messaging (FCM) or similar services. Update the `postNotification.service.js` with your preferred push notification provider.

## 🛡️ Security & Moderation

### Content Moderation
- **Reporting System**: Users can report inappropriate content
- **Automatic Flagging**: Suspicious activity detection
- **Admin Review**: Reported content goes to admin queue
- **User Suspension**: Repeat offenders can be suspended

### Privacy & Data Protection
- **IP Tracking**: For analytics and abuse prevention
- **View Cleanup**: Old anonymous views automatically cleaned
- **GDPR Compliant**: User data can be exported/deleted

## 🧪 Testing

### Run Tests
```bash
# Run post system tests
npm test tests/post.test.js

# Run all tests
npm test
```

### Test Coverage
- Post creation with business logic validation
- Feed pagination and filtering
- All interaction types (like, comment, save, share)
- Search and discovery features
- Error handling and validation

## 🚀 Performance Optimization

### Database Optimizations
- **Indexes**: Optimized for common query patterns
- **Materialized Views**: For analytics and trending content
- **Constraints**: Data integrity at database level
- **Cleanup Jobs**: Automatic cleanup of old data

### Caching Strategy
- **Feed Caching**: Cache popular feeds
- **Trending Content**: Cache trending posts and hashtags
- **User Stats**: Cache user statistics
- **Analytics**: Cache agency analytics

### Recommended Caching
```javascript
// Example Redis caching for feed
const getFeedCached = async (userId, page, filters) => {
  const cacheKey = `feed:${userId}:${page}:${JSON.stringify(filters)}`;
  
  let feed = await redis.get(cacheKey);
  if (!feed) {
    feed = await postController.getFeed({ userId, page, filters });
    await redis.setex(cacheKey, 300, JSON.stringify(feed)); // 5 min cache
  }
  
  return JSON.parse(feed);
};
```

## 🔮 Future Enhancements

### Planned Features
- **Stories**: Instagram-like stories feature
- **Live Streaming**: Live travel updates
- **AR Filters**: Location-based AR filters
- **AI Recommendations**: Smart content recommendations
- **Multi-language**: Support for multiple languages
- **Video Editing**: In-app video editing tools

### Integration Opportunities
- **Maps Integration**: Show posts on map
- **Weather Data**: Include weather information
- **Social Sharing**: Direct sharing to external platforms
- **Booking Integration**: Direct booking from posts
- **Travel Recommendations**: AI-powered suggestions

## 📞 Support & Contributing

### Issues & Bug Reports
Please create detailed issues in the repository with:
- Steps to reproduce
- Expected vs actual behavior
- Error logs and screenshots
- Environment details

### Contributing Guidelines
1. Fork the repository
2. Create feature branch
3. Add comprehensive tests
4. Update documentation
5. Submit pull request

### Contact
For questions or support, please reach out to the development team.

---

Built with ❤️ for authentic travel experiences
