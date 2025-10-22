# Post System API Documentation

## Overview
This document covers the comprehensive Instagram-like post system for the SafarWay travel application. Users can create posts about their travel experiences, but only after completing their booked trips.

## Business Logic Rules

### Post Eligibility
1. **User must have a completed booking** with the agency and tour package they want to post about
2. **Trip must be finished** - the end date (or start date if no end date) must be in the past
3. **Only verified bookings** are eligible for posting
4. **One post per booking** - users can create multiple posts for the same booking

### Authentication
Most endpoints require authentication using JWT tokens in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### 1. Create Post
**POST** `/api/posts`

Create a new post about a completed trip.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "type": "PHOTO|REEL|CAROUSEL",
  "caption": "Amazing trip to Kerala backwaters! #kerala #backwaters",
  "mediaUrls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "thumbnailUrl": "https://example.com/thumbnail.jpg", // For reels
  "duration": 30, // For reels, in seconds
  "location": "Alleppey, Kerala",
  "bookingId": "uuid-of-completed-booking",
  "agencyId": "uuid-of-agency",
  "tourPackageId": "uuid-of-tour-package",
  "hashtags": ["kerala", "backwaters", "amazing"],
  "taggedUsers": ["uuid-of-user1", "uuid-of-user2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "post-uuid",
    "type": "PHOTO",
    "caption": "Amazing trip...",
    "mediaUrls": ["..."],
    "user": { "id": "...", "name": "...", "profileImage": "..." },
    "agency": { "id": "...", "name": "...", "logo": "..." },
    "tourPackage": { "id": "...", "title": "...", "destination": "..." },
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

### 2. Get Posts Feed
**GET** `/api/posts/feed`

Get a paginated feed of posts (Instagram-like timeline).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Posts per page (default: 10, max: 50)
- `type` (optional): Filter by post type (PHOTO|REEL|CAROUSEL)
- `agencyId` (optional): Filter by specific agency
- `tourPackageId` (optional): Filter by specific tour package
- `following` (optional): Show only posts from subscribed agencies (boolean)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "post-uuid",
      "type": "PHOTO",
      "caption": "Amazing trip...",
      "mediaUrls": ["..."],
      "user": { "id": "...", "name": "...", "profileImage": "..." },
      "agency": { "id": "...", "name": "...", "logo": "..." },
      "tourPackage": { "id": "...", "title": "...", "destination": "..." },
      "isLiked": true,
      "isSaved": false,
      "likes": 45,
      "commentsCount": 12,
      "savesCount": 8,
      "sharesCount": 3,
      "viewCount": 234,
      "hashtags": [{ "hashtag": "#kerala" }],
      "tags": [{ "user": { "name": "John" } }],
      "comments": [
        {
          "id": "comment-uuid",
          "content": "Looks amazing!",
          "user": { "name": "Jane" },
          "createdAt": "2025-01-15T11:00:00Z"
        }
      ],
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "hasMore": true
  }
}
```

### 3. Like/Unlike Post
**POST** `/api/posts/:postId/like`

Toggle like on a post.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "success": true,
  "message": "Post liked" | "Post unliked",
  "isLiked": true | false
}
```

### 4. Save/Unsave Post
**POST** `/api/posts/:postId/save`

Toggle save on a post.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "success": true,
  "message": "Post saved" | "Post unsaved",
  "isSaved": true | false
}
```

### 5. Add Comment
**POST** `/api/posts/:postId/comments`

Add a comment or reply to a post.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "content": "This looks amazing! How was the experience?",
  "parentCommentId": "comment-uuid" // Optional, for replies
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "id": "comment-uuid",
    "content": "This looks amazing!...",
    "user": { "id": "...", "name": "...", "profileImage": "..." },
    "createdAt": "2025-01-15T12:00:00Z"
  }
}
```

### 6. Get Comments
**GET** `/api/posts/comments/:postId`

Get comments for a post.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Comments per page (default: 20)
- `parentCommentId` (optional): Get replies for a specific comment

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "comment-uuid",
      "content": "Amazing photos!",
      "user": { "id": "...", "name": "...", "profileImage": "..." },
      "isLiked": false,
      "likesCount": 5,
      "repliesCount": 2,
      "createdAt": "2025-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

### 7. Share Post
**POST** `/api/posts/:postId/share`

Share a post to external platforms.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "platform": "whatsapp|facebook|instagram|twitter" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post shared successfully"
}
```

### 8. Report Post
**POST** `/api/posts/:postId/report`

Report a post for moderation.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "reason": "SPAM|INAPPROPRIATE_CONTENT|HARASSMENT|COPYRIGHT|FAKE_REVIEW|OTHER",
  "description": "Optional description of the issue"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post reported successfully. We will review it soon."
}
```

### 9. Get Eligible Bookings
**GET** `/api/posts/eligible-bookings`

Get user's completed bookings that are eligible for posting.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-uuid",
      "startDate": "2025-01-01",
      "endDate": "2025-01-05",
      "agency": { "id": "...", "name": "...", "logo": "..." },
      "tourPackage": { "id": "...", "title": "...", "destination": "..." },
      "hasPosted": false
    }
  ]
}
```

### 10. Get Saved Posts
**GET** `/api/posts/saved`

Get user's saved posts.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Posts per page (default: 20)

### 11. Get Trending Posts
**GET** `/api/posts/trending`

Get trending posts based on engagement.

**Query Parameters:**
- `timeframe` (optional): 1d|7d|30d (default: 7d)
- `limit` (optional): Number of posts (default: 20)

### 12. Search Posts
**GET** `/api/posts/search`

Search posts by keywords.

**Query Parameters:**
- `q`: Search query (required, min 2 characters)
- `page` (optional): Page number
- `limit` (optional): Posts per page
- `type` (optional): Filter by post type
- `agencyId` (optional): Filter by agency
- `tourType` (optional): Filter by tour type

### 13. Get Posts by Hashtag
**GET** `/api/posts/hashtag/:hashtag`

Get posts with a specific hashtag.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Posts per page

### 14. Get Popular Hashtags
**GET** `/api/posts/hashtags/popular`

Get trending hashtags.

**Query Parameters:**
- `limit` (optional): Number of hashtags (default: 20)
- `timeframe` (optional): 1d|7d|30d (default: 7d)

### 15. Get User Posts
**GET** `/api/posts/user/:userId`

Get posts by a specific user.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Posts per page
- `type` (optional): Filter by post type

### 16. Post Collections (Albums)

#### Create Collection
**POST** `/api/posts/collections`

**Request Body:**
```json
{
  "name": "Kerala Trip 2025",
  "description": "All my memories from Kerala",
  "coverImage": "https://example.com/cover.jpg",
  "isPublic": true
}
```

#### Add Post to Collection
**POST** `/api/posts/collections/add-post`

**Request Body:**
```json
{
  "collectionId": "collection-uuid",
  "postId": "post-uuid"
}
```

#### Get User Collections
**GET** `/api/posts/collections`

### 17. Analytics (For Agencies)
**GET** `/api/posts/analytics/:agencyId`

Get post analytics for an agency.

**Headers:**
- `Authorization: Bearer <token>` (required - Agency admin/user or SafarWay admin)

**Query Parameters:**
- `startDate` (optional): Start date for analytics
- `endDate` (optional): End date for analytics

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalPosts": 150,
      "totalLikes": 2500,
      "totalComments": 800,
      "totalShares": 300,
      "totalSaves": 450,
      "avgEngagement": 26.67
    },
    "topPosts": [...],
    "engagementByType": [
      { "type": "PHOTO", "_avg": { "viewCount": 245 }, "_count": { "id": 120 } },
      { "type": "REEL", "_avg": { "viewCount": 890 }, "_count": { "id": 30 } }
    ]
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "mediaUrls",
      "message": "Must provide 1-10 media URLs"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You can only post about completed trips you have booked"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Post not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create post",
  "error": "Database connection error"
}
```

## Post Types

### PHOTO
- Single or multiple images
- Caption and hashtags
- Location tagging
- User tagging

### REEL
- Short video content (max 5 minutes)
- Thumbnail required
- Duration in seconds
- Same features as photos

### CAROUSEL
- Multiple images/videos in a swipeable format
- Mix of photos and short videos
- Shared caption and tags

## Hashtag System

- Hashtags are automatically extracted from captions
- Additional hashtags can be provided in the hashtags array
- Hashtags are searchable and trending
- Format: #kerala, #backwaters, etc.

## Tagging System

- Users can tag other users in posts
- Tagged users receive notifications
- Tagged users appear in the post metadata
- Only existing users can be tagged

## Moderation

- Users can report posts for various reasons
- Reported posts are flagged for admin review
- Posts can be hidden, archived, or removed
- Repeat offenders can be suspended

## Privacy & Security

- Posts are public by default
- Users can only post about trips they actually took
- Business logic prevents fake reviews/posts
- IP tracking for analytics and abuse prevention
- Rate limiting on post creation and interactions

## Performance Considerations

- Pagination on all list endpoints
- Efficient indexing on frequently queried fields
- Caching for trending content
- Image/video optimization recommended
- CDN usage for media files

## Integration Points

- **Booking System**: Validates completed trips
- **User System**: Authentication and user profiles
- **Agency System**: Agency information and verification
- **Notification System**: For likes, comments, tags
- **File Upload System**: For media handling
- **Analytics System**: For engagement tracking
