-- Essential Post System Indexes for Neon DB
-- Copy and paste this into Neon SQL Editor

-- Core Post table indexes
CREATE INDEX "Post_userId_idx" ON "Post"("userId");
CREATE INDEX "Post_agencyId_idx" ON "Post"("agencyId");
CREATE INDEX "Post_tourPackageId_idx" ON "Post"("tourPackageId");
CREATE INDEX "Post_status_idx" ON "Post"("status");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt" DESC);

-- Interaction table indexes
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");
CREATE INDEX "PostComment_postId_idx" ON "PostComment"("postId");
CREATE INDEX "PostSave_userId_idx" ON "PostSave"("userId");
CREATE INDEX "PostHashtag_hashtag_idx" ON "PostHashtag"("hashtag");

-- Composite indexes for performance
CREATE INDEX "Post_status_createdAt_idx" ON "Post"("status", "createdAt" DESC);
CREATE INDEX "Post_agency_status_idx" ON "Post"("agencyId", "status");
