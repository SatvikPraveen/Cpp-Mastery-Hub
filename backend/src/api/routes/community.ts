import { Prisma, PostStatus } from '@prisma/client';
import { Router, type Request } from 'express';
import { z } from 'zod';

import { prisma } from '../../config/database';
import { NotificationType, notificationService } from '../../services/notification/notification-service';
import { ApiError } from '../../utils/errors';
import { handle, parse, requireUserId } from '../http';
import { authenticateToken, hasRoleAtLeast, optionalAuth } from '../middleware/auth';

/**
 * Discussion forum.
 *
 *   GET    /categories
 *   GET    /posts                 ?category&tag&search&sort=recent|top&limit&offset
 *   GET    /posts/trending        most-liked posts of the last 7 days
 *   GET    /posts/:id             increments the view counter
 *   POST   /posts                 (auth)
 *   PATCH  /posts/:id             (author, or moderator)
 *   DELETE /posts/:id             (author, or moderator)
 *   POST   /posts/:id/like, DELETE /posts/:id/like     idempotent (auth)
 *   GET    /posts/:id/comments    threaded via parentId
 *   POST   /posts/:id/comments    (auth; rejected when the post is locked)
 *   PATCH  /posts/:id/comments/:commentId, DELETE ...  (author, or moderator)
 *   POST   /posts/:id/report      flag a post for moderators (auth; one open report per user)
 *   GET    /leaderboard           most active contributors in the last 30 days
 *
 * Post and comment bodies are stored as submitted (Markdown). Rendering must sanitise them;
 * see docs/research/threat-model.md.
 */
const router = Router();

const author = { select: { id: true, username: true, avatarUrl: true } } as const;
const postId = z.object({ id: z.string().min(1).max(64) });
const commentParams = postId.extend({ commentId: z.string().min(1).max(64) });

const postBody = z.object({
  title: z.string().trim().min(5).max(200),
  content: z.string().trim().min(1).max(20_000),
  categoryId: z.string().min(1).max(64).optional(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(5).default([]),
});
const commentBody = z.object({
  content: z.string().trim().min(1).max(5_000),
  parentId: z.string().min(1).max(64).optional(),
});

function canModerate(req: Request): boolean {
  return req.user !== undefined && hasRoleAtLeast(req.user, 'MODERATOR');
}

async function loadOwnedPost(id: string, req: Request) {
  const post = await prisma.forumPost.findUnique({ where: { id }, select: { userId: true, isLocked: true } });
  if (!post) throw new ApiError(404, 'Post not found');
  if (post.userId !== req.user?.id && !canModerate(req)) throw new ApiError(403, 'Not allowed');
  return post;
}

router.get(
  '/categories',
  handle(async (_req, res) => {
    const categories = await prisma.forumCategory.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
      include: { _count: { select: { posts: { where: { status: PostStatus.PUBLISHED } } } } },
    });
    res.json({ success: true, data: categories });
  })
);

router.get(
  '/posts',
  handle(async (req, res) => {
    const q = parse(
      z.object({
        category: z.string().max(64).optional(),
        tag: z.string().max(30).optional(),
        search: z.string().max(100).optional(),
        sort: z.enum(['recent', 'top']).default('recent'),
        limit: z.coerce.number().int().min(1).max(50).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      }),
      req.query
    );
    const where: Prisma.ForumPostWhereInput = { status: PostStatus.PUBLISHED };
    if (q.category) where.categoryId = q.category;
    if (q.tag) where.tags = { has: q.tag.toLowerCase() };
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { content: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    const orderBy: Prisma.ForumPostOrderByWithRelationInput[] =
      q.sort === 'top' ? [{ isPinned: 'desc' }, { likes: 'desc' }] : [{ isPinned: 'desc' }, { createdAt: 'desc' }];
    const [items, total] = await prisma.$transaction([
      prisma.forumPost.findMany({
        where,
        orderBy,
        skip: q.offset,
        take: q.limit,
        include: { user: author, category: true, _count: { select: { comments: true } } },
      }),
      prisma.forumPost.count({ where }),
    ]);
    res.json({ success: true, data: { items, total, limit: q.limit, offset: q.offset } });
  })
);

router.get(
  '/posts/trending',
  handle(async (_req, res) => {
    const posts = await prisma.forumPost.findMany({
      where: { status: PostStatus.PUBLISHED, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      orderBy: [{ likes: 'desc' }, { views: 'desc' }],
      take: 10,
      include: { user: author, _count: { select: { comments: true } } },
    });
    res.json({ success: true, data: posts });
  })
);

router.get(
  '/posts/:id',
  optionalAuth,
  handle(async (req, res) => {
    const { id } = parse(postId, req.params);
    const post = await prisma.forumPost
      .update({
        where: { id, status: PostStatus.PUBLISHED },
        data: { views: { increment: 1 } },
        include: { user: author, category: true, _count: { select: { comments: true } } },
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          throw new ApiError(404, 'Post not found');
        }
        throw error;
      });
    const viewerId = req.user?.id;
    const isLikedByUser = viewerId
      ? (await prisma.forumPostLike.count({ where: { postId: id, userId: viewerId } })) > 0
      : false;
    res.json({ success: true, data: { ...post, isLikedByUser } });
  })
);

router.post(
  '/posts',
  authenticateToken,
  handle(async (req, res) => {
    const body = parse(postBody, req.body);
    if (body.categoryId) {
      const category = await prisma.forumCategory.findFirst({ where: { id: body.categoryId, isActive: true } });
      if (!category) throw new ApiError(400, 'Unknown category');
    }
    const post = await prisma.forumPost.create({
      data: {
        userId: requireUserId(req),
        title: body.title,
        content: body.content,
        categoryId: body.categoryId ?? null,
        tags: [...new Set(body.tags)],
      },
      include: { user: author },
    });
    res.status(201).json({ success: true, data: post });
  })
);

router.patch(
  '/posts/:id',
  authenticateToken,
  handle(async (req, res) => {
    const { id } = parse(postId, req.params);
    const body = parse(postBody.partial().omit({ categoryId: true }), req.body);
    await loadOwnedPost(id, req);
    const data: Prisma.ForumPostUpdateInput = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.content !== undefined) data.content = body.content;
    if (body.tags !== undefined) data.tags = [...new Set(body.tags)];
    res.json({ success: true, data: await prisma.forumPost.update({ where: { id }, data }) });
  })
);

router.delete(
  '/posts/:id',
  authenticateToken,
  handle(async (req, res) => {
    const { id } = parse(postId, req.params);
    await loadOwnedPost(id, req);
    await prisma.forumPost.delete({ where: { id } });
    res.status(204).end();
  })
);

router.post(
  '/posts/:id/like',
  authenticateToken,
  handle(async (req, res) => {
    const { id } = parse(postId, req.params);
    const userId = requireUserId(req);
    const likes = await prisma.$transaction(async (tx) => {
      const exists = await tx.forumPost.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new ApiError(404, 'Post not found');
      const { count } = await tx.forumPostLike.createMany({ data: [{ userId, postId: id }], skipDuplicates: true });
      const post =
        count > 0
          ? await tx.forumPost.update({ where: { id }, data: { likes: { increment: 1 } } })
          : await tx.forumPost.findUniqueOrThrow({ where: { id } });
      return post.likes;
    });
    res.json({ success: true, data: { likes } });
  })
);

router.delete(
  '/posts/:id/like',
  authenticateToken,
  handle(async (req, res) => {
    const { id } = parse(postId, req.params);
    const userId = requireUserId(req);
    const likes = await prisma.$transaction(async (tx) => {
      const { count } = await tx.forumPostLike.deleteMany({ where: { userId, postId: id } });
      const post =
        count > 0
          ? await tx.forumPost.update({ where: { id }, data: { likes: { decrement: count } } })
          : await tx.forumPost.findUnique({ where: { id } });
      if (!post) throw new ApiError(404, 'Post not found');
      return post.likes;
    });
    res.json({ success: true, data: { likes } });
  })
);

router.get(
  '/posts/:id/comments',
  handle(async (req, res) => {
    const { id } = parse(postId, req.params);
    const comments = await prisma.forumComment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'asc' },
      include: { user: author },
    });
    res.json({ success: true, data: comments });
  })
);

router.post(
  '/posts/:id/comments',
  authenticateToken,
  handle(async (req, res) => {
    const { id } = parse(postId, req.params);
    const body = parse(commentBody, req.body);
    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { isLocked: true, status: true, userId: true, title: true },
    });
    if (!post || post.status !== PostStatus.PUBLISHED) throw new ApiError(404, 'Post not found');
    if (post.isLocked) throw new ApiError(423, 'This discussion is locked');
    if (body.parentId) {
      const parent = await prisma.forumComment.findFirst({ where: { id: body.parentId, postId: id } });
      if (!parent) throw new ApiError(400, 'Parent comment does not belong to this post');
    }
    const comment = await prisma.forumComment.create({
      data: { postId: id, userId: requireUserId(req), content: body.content, parentId: body.parentId ?? null },
      include: { user: author },
    });
    if (post.userId !== comment.userId) {
      await notificationService.notify({
        userId: post.userId,
        type: NotificationType.FORUM_REPLY,
        title: 'New reply',
        message: `${comment.user.username} replied to "${post.title}"`,
        data: { postId: id, commentId: comment.id },
      });
    }
    res.status(201).json({ success: true, data: comment });
  })
);

async function loadOwnedComment(params: { id: string; commentId: string }, req: Request) {
  const comment = await prisma.forumComment.findFirst({
    where: { id: params.commentId, postId: params.id },
    select: { userId: true },
  });
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (comment.userId !== req.user?.id && !canModerate(req)) throw new ApiError(403, 'Not allowed');
}

router.patch(
  '/posts/:id/comments/:commentId',
  authenticateToken,
  handle(async (req, res) => {
    const params = parse(commentParams, req.params);
    const { content } = parse(commentBody.pick({ content: true }), req.body);
    await loadOwnedComment(params, req);
    res.json({ success: true, data: await prisma.forumComment.update({ where: { id: params.commentId }, data: { content } }) });
  })
);

router.delete(
  '/posts/:id/comments/:commentId',
  authenticateToken,
  handle(async (req, res) => {
    const params = parse(commentParams, req.params);
    await loadOwnedComment(params, req);
    await prisma.forumComment.delete({ where: { id: params.commentId } });
    res.status(204).end();
  })
);

router.post(
  '/posts/:id/report',
  authenticateToken,
  handle(async (req, res) => {
    const { id } = parse(postId, req.params);
    const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(500) }), req.body);
    const reporterId = requireUserId(req);
    const post = await prisma.forumPost.findUnique({ where: { id }, select: { userId: true } });
    if (!post) throw new ApiError(404, 'Post not found');
    if (post.userId === reporterId) throw new ApiError(400, 'You cannot report your own post');
    const report = await prisma.postReport.upsert({
      where: { postId_reporterId: { postId: id, reporterId } },
      // Re-reporting reopens a dismissed report with the new reason.
      create: { postId: id, reporterId, reason },
      update: { reason, status: 'OPEN', resolvedAt: null, resolvedById: null },
    });
    res.status(201).json({ success: true, data: { id: report.id, status: report.status } });
  })
);

/**
 * Contribution score over the last 30 days: 5 per published post, 2 per comment, 1 per like
 * received on posts. Computed in SQL so it scales with the number of users, not of rows fetched.
 */
router.get(
  '/leaderboard',
  optionalAuth,
  handle(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const rows = await prisma.$queryRaw<
      Array<{ id: string; username: string; avatar_url: string | null; posts: bigint; comments: bigint; likes: bigint }>
    >`
      SELECT u.id, u.username, u.avatar_url,
             COALESCE(p.posts, 0)    AS posts,
             COALESCE(c.comments, 0) AS comments,
             COALESCE(p.likes, 0)    AS likes
      FROM users u
      LEFT JOIN (SELECT user_id, COUNT(*) AS posts, SUM(likes) AS likes
                 FROM forum_posts WHERE status = 'PUBLISHED' AND created_at >= ${since}
                 GROUP BY user_id) p ON p.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) AS comments
                 FROM forum_comments WHERE created_at >= ${since}
                 GROUP BY user_id) c ON c.user_id = u.id
      WHERE u.is_active AND (p.posts IS NOT NULL OR c.comments IS NOT NULL)
      ORDER BY (5 * COALESCE(p.posts, 0) + 2 * COALESCE(c.comments, 0) + COALESCE(p.likes, 0)) DESC
      LIMIT 20`;
    const data = rows.map((r) => {
      const posts = Number(r.posts);
      const comments = Number(r.comments);
      const likes = Number(r.likes);
      return { id: r.id, username: r.username, avatarUrl: r.avatar_url, posts, comments, likes, score: 5 * posts + 2 * comments + likes };
    });
    res.json({ success: true, data });
  })
);

export default router;
