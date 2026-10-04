import type { Express } from 'express';
import request from 'supertest';

import { json, sampleReport, startStubEngine, type StubEngine } from '../helpers/stub-engine';

const queryRaw = jest.fn();
const sessionFindFirst = jest.fn();

jest.mock('../../src/config/database', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
    userSession: { findFirst: (...args: unknown[]) => sessionFindFirst(...args), update: jest.fn() },
  },
  checkDatabaseHealth: async () => {
    try {
      await queryRaw();
      return { postgres: true, details: { postgres: 'Connected' } };
    } catch (error) {
      return { postgres: false, details: { postgres: (error as Error).message } };
    }
  },
}));

let stub: StubEngine;
let app: Express;

beforeAll(async () => {
  stub = await startStubEngine((req, _body, res) => {
    if (req.url === '/health') return json(res, 200, { status: 'ok', engine: 'cppmastery 2.0.0 (test)' });
    if (req.url === '/rules') return json(res, 200, { ...sampleReport, rules: [] });
    if (req.url === '/analyze') return json(res, 200, sampleReport);
    if (req.url === '/layout') return json(res, 200, { schema: 'cppmastery.layout/1', abi: { name: 'lp64', pointer_size: 8 }, structs: [] });
    return json(res, 404, { error: 'unknown endpoint', status: 404 });
  });
  process.env['CPP_ENGINE_URL'] = stub.url;
  // Import after the stub is listening: configuration is read at import time.
  const { createApp } = await import('../../src/app');
  app = createApp();
});

afterAll(async () => {
  await stub.close();
});

beforeEach(() => {
  queryRaw.mockReset().mockResolvedValue([{ '?column?': 1 }]);
  sessionFindFirst.mockReset().mockResolvedValue(null);
});

describe('health', () => {
  it('reports database and engine status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', dependencies: { database: 'Connected', engine: 'cppmastery 2.0.0 (test)' } });
  });

  it('returns 503 when the database is down', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
  });
});

describe('analysis API', () => {
  it('proxies a valid request to the engine', async () => {
    const res = await request(app).post('/api/analysis/analyze').send({ code: 'int main(){ char b[8]; gets(b); }', options: { maxNesting: 3 } });
    expect(res.status).toBe(200);
    expect(res.body.data.schema).toBe('cppmastery.analysis/1');
    expect(stub.calls.at(-1)).toMatchObject({ path: '/analyze', body: { config: { max_nesting: 3 } } });
  });

  it('validates input and reports every issue', async () => {
    const res = await request(app).post('/api/analysis/analyze').send({ code: '', options: { maxNesting: 0, bogus: true } });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const paths = (res.body.details.issues as Array<{ path: string }>).map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(['code', 'options.maxNesting', 'options']));
  });

  it('rejects disable entries that are not rule ids', async () => {
    const res = await request(app).post('/api/analysis/analyze').send({ code: 'int x;', options: { disable: ['../../etc'] } });
    expect(res.status).toBe(400);
  });

  it('serves the layout endpoint with ABI validation', async () => {
    expect((await request(app).post('/api/analysis/layout').send({ code: 'struct S{};', abi: 'lp64' })).status).toBe(200);
    expect((await request(app).post('/api/analysis/layout').send({ code: 'struct S{};', abi: 'win16' })).status).toBe(400);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app).post('/api/analysis/analyze').set('Content-Type', 'application/json').send('{"code":');
    expect(res.status).toBe(400);
  });

  it('rejects bodies above the 1 MiB limit with 413', async () => {
    const res = await request(app).post('/api/analysis/analyze').send({ code: 'x'.repeat(1_100_000) });
    expect(res.status).toBe(413);
  });
});

describe('code API', () => {
  it('declines execution explicitly with 501', async () => {
    const res = await request(app).post('/api/code/execute').send({ code: 'int main(){}' });
    expect(res.status).toBe(501);
    expect(res.body.code).toBe('EXECUTION_NOT_IMPLEMENTED');
  });

  it('serves templates and filters by difficulty', async () => {
    const all = await request(app).get('/api/code/templates');
    const beginner = await request(app).get('/api/code/templates?difficulty=beginner');
    expect(all.body.data.length).toBeGreaterThan(beginner.body.data.length);
    expect(beginner.body.data.every((t: { difficulty: string }) => t.difficulty === 'beginner')).toBe(true);
  });
});

describe('authentication boundary', () => {
  it.each([
    ['get', '/api/users/me'],
    ['get', '/api/notifications'],
    ['get', '/api/admin/stats'],
    ['post', '/api/code/snippets'],
    ['get', '/api/learning/progress'],
  ] as const)('%s %s requires a bearer token', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it('rejects a syntactically valid token with no active session', async () => {
    const { generateTokens } = await import('../../src/services/auth/jwt');
    const { accessToken } = generateTokens('u1');
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('SESSION_INVALID');
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/users/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });
});

describe('framework behaviour', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: 'ROUTE_NOT_FOUND' });
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
