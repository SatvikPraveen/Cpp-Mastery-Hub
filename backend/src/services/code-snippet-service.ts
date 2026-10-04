import { Prisma, type CodeSnippet } from '@prisma/client';

import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';

export interface SnippetInput {
  title: string;
  code: string;
  language: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface SnippetQuery {
  search?: string;
  language?: string;
  tag?: string;
  limit: number;
  offset: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

const authorSelect = { select: { id: true, username: true, avatarUrl: true } } as const;

/** CRUD and discovery for code snippets. Visibility: owners see everything they own; others see public snippets only. */
export class CodeSnippetService {
  constructor(private readonly db: typeof prisma = prisma) {}

  async listPublic(query: SnippetQuery): Promise<Page<CodeSnippet>> {
    return this.page({ ...this.filters(query), isPublic: true }, query, { createdAt: 'desc' });
  }

  async listMine(userId: string, query: SnippetQuery): Promise<Page<CodeSnippet>> {
    return this.page({ ...this.filters(query), userId }, query, { updatedAt: 'desc' });
  }

  async popular(limit: number): Promise<CodeSnippet[]> {
    return this.db.codeSnippet.findMany({
      where: { isPublic: true },
      orderBy: [{ likes: 'desc' }, { views: 'desc' }],
      take: limit,
      include: { user: authorSelect },
    });
  }

  async get(id: string, viewerId?: string): Promise<CodeSnippet> {
    const snippet = await this.db.codeSnippet.findUnique({
      where: { id },
      include: { user: authorSelect },
    });
    if (!snippet || (!snippet.isPublic && snippet.userId !== viewerId)) {
      // Private snippets are indistinguishable from missing ones to non-owners.
      throw new ApiError(404, 'Snippet not found');
    }
    if (snippet.userId !== viewerId) {
      await this.db.codeSnippet.update({ where: { id }, data: { views: { increment: 1 } } });
    }
    return snippet;
  }

  async create(userId: string, input: SnippetInput): Promise<CodeSnippet> {
    return this.db.codeSnippet.create({
      data: {
        userId,
        title: input.title,
        code: input.code,
        language: input.language,
        description: input.description ?? null,
        tags: input.tags ?? [],
        isPublic: input.isPublic ?? false,
      },
    });
  }

  async update(id: string, userId: string, input: Partial<SnippetInput>): Promise<CodeSnippet> {
    await this.assertOwner(id, userId);
    const data: Prisma.CodeSnippetUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.code !== undefined) data.code = input.code;
    if (input.language !== undefined) data.language = input.language;
    if (input.description !== undefined) data.description = input.description;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.isPublic !== undefined) data.isPublic = input.isPublic;
    return this.db.codeSnippet.update({ where: { id }, data });
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    if (!isAdmin) await this.assertOwner(id, userId);
    try {
      await this.db.codeSnippet.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ApiError(404, 'Snippet not found');
      }
      throw error;
    }
  }

  /** Idempotent: liking twice keeps one like. Returns the new like count. */
  async like(id: string, userId: string): Promise<number> {
    await this.get(id, userId);
    return this.db.$transaction(async (tx) => {
      // ON CONFLICT DO NOTHING: catching a unique violation instead would abort the
      // surrounding PostgreSQL transaction (SQLSTATE 25P02).
      const { count } = await tx.snippetLike.createMany({
        data: [{ userId, snippetId: id }],
        skipDuplicates: true,
      });
      const snippet = count > 0
        ? await tx.codeSnippet.update({ where: { id }, data: { likes: { increment: 1 } } })
        : await tx.codeSnippet.findUniqueOrThrow({ where: { id } });
      return snippet.likes;
    });
  }

  /** Idempotent counterpart of `like`. Returns the new like count. */
  async unlike(id: string, userId: string): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const { count } = await tx.snippetLike.deleteMany({ where: { userId, snippetId: id } });
      const snippet =
        count > 0
          ? await tx.codeSnippet.update({ where: { id }, data: { likes: { decrement: count } } })
          : await tx.codeSnippet.findUnique({ where: { id } });
      if (!snippet) throw new ApiError(404, 'Snippet not found');
      return snippet.likes;
    });
  }

  private filters(query: SnippetQuery): Prisma.CodeSnippetWhereInput {
    const where: Prisma.CodeSnippetWhereInput = {};
    if (query.language) where.language = query.language;
    if (query.tag) where.tags = { has: query.tag };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private async page(
    where: Prisma.CodeSnippetWhereInput,
    query: SnippetQuery,
    orderBy: Prisma.CodeSnippetOrderByWithRelationInput
  ): Promise<Page<CodeSnippet>> {
    const [items, total] = await this.db.$transaction([
      this.db.codeSnippet.findMany({
        where,
        orderBy,
        skip: query.offset,
        take: query.limit,
        include: { user: authorSelect },
      }),
      this.db.codeSnippet.count({ where }),
    ]);
    return { items, total, limit: query.limit, offset: query.offset };
  }

  private async assertOwner(id: string, userId: string): Promise<void> {
    const snippet = await this.db.codeSnippet.findUnique({ where: { id }, select: { userId: true } });
    if (!snippet) throw new ApiError(404, 'Snippet not found');
    if (snippet.userId !== userId) throw new ApiError(403, 'Only the owner can modify this snippet');
  }
}

export const codeSnippetService = new CodeSnippetService();
