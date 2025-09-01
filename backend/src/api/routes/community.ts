// File: backend/src/api/routes/community.ts
// Extension: .ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { logger } from '../../utils/logger';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createPostSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(10),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).optional()
});

const createReplySchema = z.object({
  content: z.string().min(5),
  parentId: z.string().uuid().optional()
});

const voteSchema = z.object({
  type: z.enum(['up', 'down']).nullable()
});

// Get forum categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.forumCategory.findMany({
      include: {
        _count: {
          select: { posts: true }
        },
        posts: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    const categoriesWithStats = categories.map(category => ({
      ...category,
      postsCount: category._count.posts,
      membersCount: 0, // Would need to implement member tracking
      latestPost: category.posts[0] || null
    }));

    res.json(categoriesWithStats);
  } catch (error) {
    logger.error('Failed to get forum categories:', error);
    res.status(500).json({ error: 'Failed to retrieve forum categories' });
  }
});

// Get forum posts
router.get('/posts', async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      sort = 'recent',
      limit = 20,
      offset = 0,
      search
    } = req.query;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    let orderBy: any = {};
    switch (sort) {
      case 'popular':
        orderBy = { upvotes: 'desc' };
        break;
      case 'replies':
        orderBy = { repliesCount: 'desc' };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        orderBy,
        take: Number(limit),
        skip: Number(offset),
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
          category: {
            select: { name: true, color: true }
          },
          replies: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          _count: {
            select: { replies: true, votes: true }
          }
        }
      }),
      prisma.forumPost.count({ where })
    ]);

    const postsWithStats = posts.map(post => ({
      ...post,
      repliesCount: post._count.replies,
      votesCount: post._count.votes,
      lastReply: post.replies[0] || null
    }));

    res.json({
      posts: postsWithStats,
      total,
      hasMore: Number(offset) + posts.length < total
    });
  } catch (error) {
    logger.error('Failed to get forum posts:', error);
    res.status(500).json({ error: 'Failed to retrieve forum posts' });
  }
});

// Get single post
router.get('/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        },
        category: true,
        votes: userId ? {
          where: { userId }
        } : false,
        _count: {
          select: { replies: true, votes: true }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count
    await prisma.forumPost.update({
      where: { id },
      data: { viewsCount: { increment: 1 } }
    });

    const userVote = userId && post.votes?.length > 0 ? post.votes[0].type : null;

    res.json({
      ...post,
      userVote,
      repliesCount: post._count.replies,
      votesCount: post._count.votes
    });
  } catch (error) {
    logger.error('Failed to get forum post:', error);
    res.status(500).json({ error: 'Failed to retrieve forum post' });
  }
});

// Create new post
router.post('/posts', authMiddleware, validateRequest(createPostSchema), async (req: Request, res: Response) => {
  try {
    const { title, content, categoryId, tags } = req.body;
    const userId = req.user!.id;

    const post = await prisma.forumPost.create({
      data: {
        title,
        content,
        categoryId,
        authorId: userId,
        tags: tags || [],
        createdAt: new Date()
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        },
        category: true
      }
    });

    res.status(201).json(post);
  } catch (error) {
    logger.error('Failed to create forum post:', error);
    res.status(500).json({ error: 'Failed to create forum post' });
  }
});

// Vote on post
router.post('/posts/:id/vote', authMiddleware, validateRequest(voteSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const userId = req.user!.id;

    // Remove existing vote
    await prisma.forumVote.deleteMany({
      where: { postId: id, userId }
    });

    let upvotes = 0, downvotes = 0;

    // Add new vote if type is not null
    if (type) {
      await prisma.forumVote.create({
        data: {
          postId: id,
          userId,
          type
        }
      });
    }

    // Recalculate vote counts
    const votes = await prisma.forumVote.groupBy({
      by: ['type'],
      where: { postId: id },
      _count: { type: true }
    });

    votes.forEach(vote => {
      if (vote.type === 'up') upvotes = vote._count.type;
      if (vote.type === 'down') downvotes = vote._count.type;
    });

    // Update post vote counts
    await prisma.forumPost.update({
      where: { id },
      data: { upvotes, downvotes }
    });

    res.json({ upvotes, downvotes });
  } catch (error) {
    logger.error('Failed to vote on post:', error);
    res.status(500).json({ error: 'Failed to vote on post' });
  }
});

// Get post replies
router.get('/posts/:id/replies', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const replies = await prisma.forumReply.findMany({
      where: { postId: id, parentId: null },
      orderBy: { createdAt: 'asc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        },
        children: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { votes: true }
        }
      }
    });

    res.json(replies);
  } catch (error) {
    logger.error('Failed to get post replies:', error);
    res.status(500).json({ error: 'Failed to retrieve post replies' });
  }
});

// Create reply
router.post('/posts/:id/replies', authMiddleware, validateRequest(createReplySchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user!.id;

    const reply = await prisma.forumReply.create({
      data: {
        content,
        postId: id,
        parentId,
        authorId: userId,
        createdAt: new Date()
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    // Update post reply count
    await prisma.forumPost.update({
      where: { id },
      data: { repliesCount: { increment: 1 } }
    });

    res.status(201).json(reply);
  } catch (error) {
    logger.error('Failed to create reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// Track post view
router.post('/posts/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.forumPost.update({
      where: { id },
      data: { viewsCount: { increment: 1 } }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to track post view:', error);
    res.status(500).json({ error: 'Failed to track post view' });
  }
});

export default router;

