import express from 'express';
import request from 'supertest';

import { createApiRateLimit, MemoryStore } from '../../src/api/middleware/ratelimit';

function appWithLimit(max: number, store = new MemoryStore(60_000)) {
  const app = express();
  app.use('/api', createApiRateLimit({ windowMs: 60_000, max, store }));
  app.get('/api/ping', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('createApiRateLimit', () => {
  it('allows requests up to the limit and then responds 429', async () => {
    const app = appWithLimit(2);
    await request(app).get('/api/ping').expect(200).expect('RateLimit-Limit', '2');
    await request(app).get('/api/ping').expect(200);
    const res = await request(app).get('/api/ping').expect(429);
    expect(res.body.error).toBe('Rate limit exceeded');
  });

  it('fails open when the backing store errors', async () => {
    const broken = new MemoryStore(60_000);
    broken.increment = () => Promise.reject(new Error('redis down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await request(appWithLimit(1, broken)).get('/api/ping').expect(200);
    errorSpy.mockRestore();
  });
});
