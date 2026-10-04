import type { RequestLogData } from '../api/middleware/logging';

import type { SafeUser } from './user';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SafeUser;
      userId?: string;
      sessionId?: string;
      requestId?: string;
      logData?: RequestLogData;
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
