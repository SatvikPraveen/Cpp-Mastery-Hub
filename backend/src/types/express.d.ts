// File: backend/src/types/express.d.ts
// Extension: .ts
// Location: backend/src/types/express.d.ts

import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      sessionId?: string;
      rateLimitInfo?: {
        remaining: number;
        reset: Date;
        limit: number;
      };
      correlationId?: string;
      startTime?: number;
    }
  }
}