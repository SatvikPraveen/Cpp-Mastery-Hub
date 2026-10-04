import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

import { ApiError } from '../utils/errors';

/** Validates `input` with a zod schema, raising a 400 ApiError that lists every issue. */
export function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, 'Invalid request', {
      issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  return result.data;
}

/** Wraps an async handler so rejections reach the Express error middleware. */
export const handle =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };

/** Drops keys whose value is undefined (required by exactOptionalPropertyTypes). */
export function stripUndefined<T extends object>(
  value: T
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}

/** The authenticated user's id; throws 401 when the request is anonymous. */
export function requireUserId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new ApiError(401, 'Authentication required');
  return id;
}
