-- Post System Indexes for Neon DB
-- Copy and paste this into your Neon SQL Editor

-- Basic indexes for Post table
CREATE INDEX IF NOT EXISTS "Post_userId_idx" ON "Post"("userId");
CREATE INDEX IF NOT EXISTS "Post_agencyId_idx" ON "Post"("agencyId");
CREATE INDEX IF NOT EXISTS "Post_tourPackageId_idx" ON "Post"("tourPackageId");
CREATE INDEX IF NOT EXISTS "Post_bookingId_idx" ON "Post"("bookingId");
CREATE INDEX IF NOT EXISTS "Post_status_idx" ON "Post"("status");
CREATE INDEX IF NOT EXISTS "Post_type_idx" ON "Post"("type");
CREATE INDEX IF NOT EXISTS "Post_createdAt_idx" ON "Post"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_isVerified_idx" ON "Post"("isVerified");
CREATE INDEX IF NOT EXISTS "Post_viewCount_idx" ON "Post"("viewCount" DESC);

-- PostLike indexes
CREATE INDEX IF NOT EXISTS "PostLike_postId_idx" ON "PostLike"("postId");
CREATE INDEX IF NOT EXISTS "PostLike_userId_idx" ON "PostLike"("userId");

-- PostComment indexes
CREATE INDEX IF NOT EXISTS "PostComment_postId_idx" ON "PostComment"("postId");
CREATE INDEX IF NOT EXISTS "PostComment_userId_idx" ON "PostComment"("userId");
CREATE INDEX IF NOT EXISTS "PostComment_parentCommentId_idx" ON "PostComment"("parentCommentId");
CREATE INDEX IF NOT EXISTS "PostComment_status_idx" ON "PostComment"("status");

-- PostSave indexes
CREATE INDEX IF NOT EXISTS "PostSave_userId_idx" ON "PostSave"("userId");
CREATE INDEX IF NOT EXISTS "PostSave_postId_idx" ON "PostSave"("postId");

-- PostHashtag indexes
CREATE INDEX IF NOT EXISTS "PostHashtag_hashtag_idx" ON "PostHashtag"("hashtag");
CREATE INDEX IF NOT EXISTS "PostHashtag_postId_idx" ON "PostHashtag"("postId");

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS "Post_status_type_createdAt_idx" ON "Post"("status", "type", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_agencyId_status_createdAt_idx" ON "Post"("agencyId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Post_userId_status_createdAt_idx" ON "Post"("userId", "status", "createdAt" DESC);
