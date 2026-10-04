import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Liveness of the Next.js server itself, used by the container healthcheck.
 *
 * Dependencies (database, engine) are reported by the backend's /health; checking them here
 * would make the web tier restart when the API is down, which only adds load during an outage.
 */
const startedAt = Date.now();

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).end();
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    environment: process.env.NODE_ENV ?? 'development',
  });
}
