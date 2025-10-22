-- Post System Migration Script
-- This script adds indexes and constraints for optimal performance

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON "Post"("userId");
CREATE INDEX IF NOT EXISTS idx_posts_agency_id ON "Post"("agencyId");
CREATE INDEX IF NOT EXISTS idx_posts_tour_package_id ON "Post"("tourPackageId");
CREATE INDEX IF NOT EXISTS idx_posts_booking_id ON "Post"("bookingId");
CREATE INDEX IF NOT EXISTS idx_posts_status ON "Post"("status");
CREATE INDEX IF NOT EXISTS idx_posts_type ON "Post"("type");
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON "Post"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_posts_is_verified ON "Post"("isVerified");
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON "Post"("viewCount" DESC);

-- PostLike indexes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON "PostLike"("postId");
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON "PostLike"("userId");
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON "PostLike"("createdAt");

-- PostComment indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON "PostComment"("postId");
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON "PostComment"("userId");
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON "PostComment"("parentCommentId");
CREATE INDEX IF NOT EXISTS idx_post_comments_status ON "PostComment"("status");
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON "PostComment"("createdAt");

-- PostSave indexes
CREATE INDEX IF NOT EXISTS idx_post_saves_user_id ON "PostSave"("userId");
CREATE INDEX IF NOT EXISTS idx_post_saves_post_id ON "PostSave"("postId");
CREATE INDEX IF NOT EXISTS idx_post_saves_created_at ON "PostSave"("createdAt" DESC);

-- PostHashtag indexes
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag ON "PostHashtag"("hashtag");
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON "PostHashtag"("postId");
CREATE INDEX IF NOT EXISTS idx_post_hashtags_created_at ON "PostHashtag"("createdAt");

-- PostView indexes for analytics
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON "PostView"("postId");
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON "PostView"("userId");
CREATE INDEX IF NOT EXISTS idx_post_views_created_at ON "PostView"("createdAt");

-- PostReport indexes for moderation
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON "PostReport"("postId");
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON "PostReport"("status");
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON "PostReport"("createdAt");

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_posts_status_type_created ON "Post"("status", "type", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_posts_agency_status_created ON "Post"("agencyId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_status_created ON "Post"("userId", "status", "createdAt" DESC);

-- Full text search index for captions (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_posts_caption_fulltext ON "Post" USING gin(to_tsvector('english', "caption"));
CREATE INDEX IF NOT EXISTS idx_posts_location_fulltext ON "Post" USING gin(to_tsvector('english', "location"));

-- Partial indexes for active content only
CREATE INDEX IF NOT EXISTS idx_posts_published_only ON "Post"("createdAt" DESC) WHERE "status" = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS idx_comments_active_only ON "PostComment"("createdAt" DESC) WHERE "status" = 'ACTIVE';

-- Add constraints to ensure data integrity
ALTER TABLE "Post" ADD CONSTRAINT check_media_urls_not_empty CHECK (array_length("mediaUrls", 1) > 0);
ALTER TABLE "Post" ADD CONSTRAINT check_reel_has_duration CHECK (("type" != 'REEL') OR ("duration" IS NOT NULL AND "duration" > 0));
ALTER TABLE "Post" ADD CONSTRAINT check_reel_has_thumbnail CHECK (("type" != 'REEL') OR ("thumbnailUrl" IS NOT NULL));
ALTER TABLE "Post" ADD CONSTRAINT check_positive_view_count CHECK ("viewCount" >= 0);
ALTER TABLE "Post" ADD CONSTRAINT check_positive_share_count CHECK ("shareCount" >= 0);

-- Add check constraint for hashtag format
ALTER TABLE "PostHashtag" ADD CONSTRAINT check_hashtag_format CHECK ("hashtag" ~ '^#[a-zA-Z0-9_]+$');

-- Add constraint for comment content
ALTER TABLE "PostComment" ADD CONSTRAINT check_comment_not_empty CHECK (length(trim("content")) > 0);

-- Function to automatically update post engagement scores
CREATE OR REPLACE FUNCTION calculate_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
    -- This could be used for real-time engagement calculations
    -- For now, we'll just ensure view counts are properly tracked
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment view count (if needed)
-- CREATE TRIGGER update_engagement_score
--     AFTER INSERT OR UPDATE ON "PostLike"
--     FOR EACH ROW
--     EXECUTE FUNCTION calculate_engagement_score();

-- Create a function to clean up old post views (for privacy/storage)
CREATE OR REPLACE FUNCTION cleanup_old_post_views()
RETURNS void AS $$
BEGIN
    DELETE FROM "PostView" 
    WHERE "createdAt" < NOW() - INTERVAL '90 days'
    AND "userId" IS NULL; -- Keep logged-in user views longer
END;
$$ LANGUAGE plpgsql;

-- Views for analytics (materialized for better performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS post_engagement_stats AS
SELECT 
    p.id as post_id,
    p."userId",
    p."agencyId",
    p."tourPackageId",
    p.type,
    p."createdAt",
    COUNT(DISTINCT pl.id) as like_count,
    COUNT(DISTINCT pc.id) as comment_count,
    COUNT(DISTINCT ps.id) as save_count,
    COUNT(DISTINCT psh.id) as share_count,
    p."viewCount",
    (COUNT(DISTINCT pl.id) + COUNT(DISTINCT pc.id) * 2 + COUNT(DISTINCT ps.id) * 3 + COUNT(DISTINCT psh.id) * 4) as engagement_score
FROM "Post" p
LEFT JOIN "PostLike" pl ON p.id = pl."postId"
LEFT JOIN "PostComment" pc ON p.id = pc."postId" AND pc.status = 'ACTIVE'
LEFT JOIN "PostSave" ps ON p.id = ps."postId"
LEFT JOIN "PostShare" psh ON p.id = psh."postId"
WHERE p.status = 'PUBLISHED'
GROUP BY p.id, p."userId", p."agencyId", p."tourPackageId", p.type, p."createdAt", p."viewCount";

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_engagement_stats_post_id ON post_engagement_stats(post_id);

-- Refresh the materialized view (should be done periodically via cron job)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY post_engagement_stats;
