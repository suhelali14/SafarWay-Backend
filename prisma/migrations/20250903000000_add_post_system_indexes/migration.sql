-- CreatePostSystemIndexes Migration
-- This is your Prisma migration file for post system indexes

-- Create indexes for better query performance on Post table
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_userId_idx" ON "Post"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_agencyId_idx" ON "Post"("agencyId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_tourPackageId_idx" ON "Post"("tourPackageId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_bookingId_idx" ON "Post"("bookingId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_status_idx" ON "Post"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_type_idx" ON "Post"("type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_createdAt_idx" ON "Post"("createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_isVerified_idx" ON "Post"("isVerified");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_viewCount_idx" ON "Post"("viewCount" DESC);

-- PostLike indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostLike_postId_idx" ON "PostLike"("postId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostLike_userId_idx" ON "PostLike"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostLike_createdAt_idx" ON "PostLike"("createdAt");

-- PostComment indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostComment_postId_idx" ON "PostComment"("postId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostComment_userId_idx" ON "PostComment"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostComment_parentCommentId_idx" ON "PostComment"("parentCommentId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostComment_status_idx" ON "PostComment"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostComment_createdAt_idx" ON "PostComment"("createdAt");

-- PostSave indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostSave_userId_idx" ON "PostSave"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostSave_postId_idx" ON "PostSave"("postId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostSave_createdAt_idx" ON "PostSave"("createdAt" DESC);

-- PostHashtag indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostHashtag_hashtag_idx" ON "PostHashtag"("hashtag");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostHashtag_postId_idx" ON "PostHashtag"("postId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostHashtag_createdAt_idx" ON "PostHashtag"("createdAt");

-- PostView indexes for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostView_postId_idx" ON "PostView"("postId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostView_userId_idx" ON "PostView"("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostView_createdAt_idx" ON "PostView"("createdAt");

-- PostReport indexes for moderation
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostReport_postId_idx" ON "PostReport"("postId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostReport_status_idx" ON "PostReport"("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostReport_createdAt_idx" ON "PostReport"("createdAt");

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_status_type_createdAt_idx" ON "Post"("status", "type", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_agencyId_status_createdAt_idx" ON "Post"("agencyId", "status", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_userId_status_createdAt_idx" ON "Post"("userId", "status", "createdAt" DESC);

-- Full text search indexes for PostgreSQL
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_caption_search_idx" ON "Post" USING gin(to_tsvector('english', coalesce("caption", '')));
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_location_search_idx" ON "Post" USING gin(to_tsvector('english', coalesce("location", '')));

-- Partial indexes for active content only
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_published_createdAt_idx" ON "Post"("createdAt" DESC) WHERE "status" = 'PUBLISHED';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PostComment_active_createdAt_idx" ON "PostComment"("createdAt" DESC) WHERE "status" = 'ACTIVE';
