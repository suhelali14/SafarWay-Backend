const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PostNotificationService {
  // Send notification when someone likes a post
  async notifyPostLike(postId, likerUserId) {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              deviceTokens: true
            }
          }
        }
      });

      const liker = await prisma.user.findUnique({
        where: { id: likerUserId },
        select: {
          name: true,
          profileImage: true
        }
      });

      if (!post || !liker || post.userId === likerUserId) {
        return; // Don't notify self-likes
      }

      // Create in-app notification (you might have a notifications table)
      const notificationData = {
        type: 'POST_LIKE',
        title: 'New Like',
        message: `${liker.name} liked your post`,
        data: {
          postId: postId,
          likerUserId: likerUserId,
          likerName: liker.name,
          likerImage: liker.profileImage
        }
      };

      // Send push notification if user has device tokens
      if (post.user.deviceTokens && post.user.deviceTokens.length > 0) {
        await this.sendPushNotification(post.user.deviceTokens, notificationData);
      }

      console.log(`Notification sent for post like: ${postId}`);
    } catch (error) {
      console.error('Error sending like notification:', error);
    }
  }

  // Send notification when someone comments on a post
  async notifyPostComment(postId, commentId, commenterUserId) {
    try {
      const [post, comment, commenter] = await Promise.all([
        prisma.post.findUnique({
          where: { id: postId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                deviceTokens: true
              }
            }
          }
        }),
        prisma.postComment.findUnique({
          where: { id: commentId },
          select: {
            content: true,
            parentCommentId: true
          }
        }),
        prisma.user.findUnique({
          where: { id: commenterUserId },
          select: {
            name: true,
            profileImage: true
          }
        })
      ]);

      if (!post || !comment || !commenter || post.userId === commenterUserId) {
        return;
      }

      const isReply = comment.parentCommentId !== null;
      const notificationData = {
        type: isReply ? 'POST_COMMENT_REPLY' : 'POST_COMMENT',
        title: isReply ? 'New Reply' : 'New Comment',
        message: `${commenter.name} ${isReply ? 'replied to' : 'commented on'} your post: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
        data: {
          postId: postId,
          commentId: commentId,
          commenterUserId: commenterUserId,
          commenterName: commenter.name,
          commenterImage: commenter.profileImage,
          isReply: isReply
        }
      };

      if (post.user.deviceTokens && post.user.deviceTokens.length > 0) {
        await this.sendPushNotification(post.user.deviceTokens, notificationData);
      }

      // If it's a reply, also notify the parent comment author
      if (isReply) {
        await this.notifyCommentReply(comment.parentCommentId, commentId, commenterUserId);
      }

      console.log(`Notification sent for post comment: ${postId}`);
    } catch (error) {
      console.error('Error sending comment notification:', error);
    }
  }

  // Send notification when someone replies to a comment
  async notifyCommentReply(parentCommentId, replyId, replierUserId) {
    try {
      const [parentComment, reply, replier] = await Promise.all([
        prisma.postComment.findUnique({
          where: { id: parentCommentId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                deviceTokens: true
              }
            }
          }
        }),
        prisma.postComment.findUnique({
          where: { id: replyId },
          select: {
            content: true,
            postId: true
          }
        }),
        prisma.user.findUnique({
          where: { id: replierUserId },
          select: {
            name: true,
            profileImage: true
          }
        })
      ]);

      if (!parentComment || !reply || !replier || parentComment.userId === replierUserId) {
        return;
      }

      const notificationData = {
        type: 'COMMENT_REPLY',
        title: 'New Reply',
        message: `${replier.name} replied to your comment: "${reply.content.substring(0, 50)}${reply.content.length > 50 ? '...' : ''}"`,
        data: {
          postId: reply.postId,
          commentId: parentCommentId,
          replyId: replyId,
          replierUserId: replierUserId,
          replierName: replier.name,
          replierImage: replier.profileImage
        }
      };

      if (parentComment.user.deviceTokens && parentComment.user.deviceTokens.length > 0) {
        await this.sendPushNotification(parentComment.user.deviceTokens, notificationData);
      }

      console.log(`Notification sent for comment reply: ${parentCommentId}`);
    } catch (error) {
      console.error('Error sending reply notification:', error);
    }
  }

  // Send notification when someone tags a user in a post
  async notifyUserTag(postId, taggedUserId, taggerUserId) {
    try {
      const [post, taggedUser, tagger] = await Promise.all([
        prisma.post.findUnique({
          where: { id: postId },
          select: {
            caption: true,
            mediaUrls: true
          }
        }),
        prisma.user.findUnique({
          where: { id: taggedUserId },
          select: {
            id: true,
            name: true,
            deviceTokens: true
          }
        }),
        prisma.user.findUnique({
          where: { id: taggerUserId },
          select: {
            name: true,
            profileImage: true
          }
        })
      ]);

      if (!post || !taggedUser || !tagger || taggedUserId === taggerUserId) {
        return;
      }

      const notificationData = {
        type: 'POST_TAG',
        title: 'You were tagged',
        message: `${tagger.name} tagged you in a post`,
        data: {
          postId: postId,
          taggerUserId: taggerUserId,
          taggerName: tagger.name,
          taggerImage: tagger.profileImage,
          postImage: post.mediaUrls[0] // First image as preview
        }
      };

      if (taggedUser.deviceTokens && taggedUser.deviceTokens.length > 0) {
        await this.sendPushNotification(taggedUser.deviceTokens, notificationData);
      }

      console.log(`Notification sent for user tag: ${taggedUserId}`);
    } catch (error) {
      console.error('Error sending tag notification:', error);
    }
  }

  // Send notification when someone shares a post
  async notifyPostShare(postId, sharerUserId, platform) {
    try {
      const [post, sharer] = await Promise.all([
        prisma.post.findUnique({
          where: { id: postId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                deviceTokens: true
              }
            }
          }
        }),
        prisma.user.findUnique({
          where: { id: sharerUserId },
          select: {
            name: true,
            profileImage: true
          }
        })
      ]);

      if (!post || !sharer || post.userId === sharerUserId) {
        return;
      }

      const notificationData = {
        type: 'POST_SHARE',
        title: 'Post Shared',
        message: `${sharer.name} shared your post${platform ? ` on ${platform}` : ''}`,
        data: {
          postId: postId,
          sharerUserId: sharerUserId,
          sharerName: sharer.name,
          sharerImage: sharer.profileImage,
          platform: platform
        }
      };

      if (post.user.deviceTokens && post.user.deviceTokens.length > 0) {
        await this.sendPushNotification(post.user.deviceTokens, notificationData);
      }

      console.log(`Notification sent for post share: ${postId}`);
    } catch (error) {
      console.error('Error sending share notification:', error);
    }
  }

  // Send push notification using Firebase Cloud Messaging or similar service
  async sendPushNotification(deviceTokens, notificationData) {
    try {
      // This is a placeholder for actual push notification implementation
      // You would integrate with Firebase FCM, Apple Push Notifications, etc.
      
      console.log('Sending push notification to devices:', deviceTokens.length);
      console.log('Notification data:', notificationData);

      // Example Firebase FCM implementation would go here:
      /*
      const admin = require('firebase-admin');
      
      const message = {
        notification: {
          title: notificationData.title,
          body: notificationData.message
        },
        data: notificationData.data,
        tokens: deviceTokens
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log('Push notification sent:', response);
      */

      // For now, just log the notification
      console.log('Push notification would be sent:', {
        tokens: deviceTokens,
        data: notificationData
      });

    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Send notification when post reaches certain milestones
  async notifyPostMilestone(postId, milestone) {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              deviceTokens: true
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
      });

      if (!post) return;

      let message = '';
      switch (milestone) {
        case 'FIRST_LIKE':
          message = 'Your post got its first like! 🎉';
          break;
        case 'TEN_LIKES':
          message = 'Your post reached 10 likes! 👏';
          break;
        case 'HUNDRED_LIKES':
          message = 'Amazing! Your post reached 100 likes! 🔥';
          break;
        case 'VIRAL':
          message = 'Your post is going viral! 🚀';
          break;
        default:
          message = 'Your post is getting attention!';
      }

      const notificationData = {
        type: 'POST_MILESTONE',
        title: 'Post Milestone',
        message: message,
        data: {
          postId: postId,
          milestone: milestone,
          likes: post._count.likes,
          comments: post._count.comments,
          saves: post._count.saves
        }
      };

      if (post.user.deviceTokens && post.user.deviceTokens.length > 0) {
        await this.sendPushNotification(post.user.deviceTokens, notificationData);
      }

      console.log(`Milestone notification sent: ${milestone} for post ${postId}`);
    } catch (error) {
      console.error('Error sending milestone notification:', error);
    }
  }

  // Batch notification for trending posts to followers/subscribers
  async notifyTrendingPost(postId) {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          },
          agency: {
            select: {
              id: true,
              name: true,
              subscriptions: {
                include: {
                  user: {
                    select: {
                      id: true,
                      deviceTokens: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!post || !post.agency.subscriptions) return;

      const subscribers = post.agency.subscriptions
        .map(sub => sub.user)
        .filter(user => user.deviceTokens && user.deviceTokens.length > 0);

      if (subscribers.length === 0) return;

      const notificationData = {
        type: 'TRENDING_POST',
        title: 'Trending Post',
        message: `Check out this trending post from ${post.agency.name}!`,
        data: {
          postId: postId,
          agencyId: post.agency.id,
          agencyName: post.agency.name,
          authorName: post.user.name
        }
      };

      // Send to all subscribers in batches
      const batchSize = 100;
      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        const deviceTokens = batch.flatMap(user => user.deviceTokens);
        
        if (deviceTokens.length > 0) {
          await this.sendPushNotification(deviceTokens, notificationData);
        }
      }

      console.log(`Trending post notification sent to ${subscribers.length} subscribers`);
    } catch (error) {
      console.error('Error sending trending post notification:', error);
    }
  }
}

module.exports = new PostNotificationService();
