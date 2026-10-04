/**
 * End-to-end learner journey against a real PostgreSQL database and the real analysis engine.
 *
 * Preconditions (CI does this; see .github/workflows/web.yml):
 *   - E2E_DATABASE_URL points at a migrated, seeded database (`prisma migrate deploy && npm run db:seed`)
 *   - CPPMASTERY_BIN points at a built `cppmastery` binary
 * Without E2E_DATABASE_URL the suite is skipped, so `npm test` stays hermetic.
 */
import { spawn, type ChildProcess } from 'child_process';
import { createServer } from 'net';
import { resolve } from 'path';

import type { Express } from 'express';
import request from 'supertest';

const databaseUrl = process.env['E2E_DATABASE_URL'];
const engineBinary = process.env['CPPMASTERY_BIN'];
const describeE2E = databaseUrl ? describe : describe.skip;

const run = Date.now().toString(36);
const password = 'Journey-Pass-1';

async function freePort(): Promise<number> {
  return new Promise((done) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => done(typeof address === 'object' && address ? address.port : 0));
    });
  });
}

describeE2E('learner journey (database + engine)', () => {
  let app: Express;
  let adapter: ChildProcess | undefined;
  let disconnect: () => Promise<void>;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function register(name: string) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `${name}_${run}`, email: `${name}.${run}@example.com`, password });
    expect(res.status).toBe(201);
    return res.body.data as { user: { id: string }; token: string; refreshToken: string };
  }

  beforeAll(async () => {
    process.env['DATABASE_URL'] = databaseUrl;
    if (engineBinary) {
      const port = await freePort();
      adapter = spawn('python3', [resolve(__dirname, '../../../cpp-engine/tools/http_adapter/cppmastery_http.py')], {
        env: { ...process.env, CPPMASTERY_BIN: engineBinary, CPPMASTERY_HOST: '127.0.0.1', CPPMASTERY_PORT: String(port) },
        stdio: 'ignore',
      });
      process.env['CPP_ENGINE_URL'] = `http://127.0.0.1:${port}`;
      for (let i = 0; i < 100; i++) {
        const ok = await fetch(`http://127.0.0.1:${port}/health`).then((r) => r.ok, () => false);
        if (ok) break;
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    const { createApp } = await import('../../src/app');
    const db = await import('../../src/config/database');
    app = createApp();
    disconnect = db.disconnectDatabases;
  });

  afterAll(async () => {
    adapter?.kill();
    await disconnect?.();
  });

  it('runs the full journey: account, learning, quiz, analysis, community, notifications', async () => {
    const ada = await register('ada');
    const bob = await register('bob');

    // Session lifecycle: the access token works, refresh rotates, reuse revokes everything.
    expect((await request(app).get('/api/users/me').set(auth(ada.token))).status).toBe(200);
    const rotated = await request(app).post('/api/auth/refresh').send({ refreshToken: ada.refreshToken });
    expect(rotated.status).toBe(200);
    expect((await request(app).get('/api/users/me').set(auth(ada.token))).status).toBe(401); // old access token
    const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken: ada.refreshToken });
    expect(reuse.status).toBe(401);
    expect((await request(app).get('/api/users/me').set(auth(rotated.body.data.token))).status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: `ada.${run}@example.com`, password });
    expect(login.status).toBe(200);
    const token: string = login.body.data.token;

    // Learning: the seeded course is public, enrolment is idempotent, progress is exact.
    const courses = await request(app).get('/api/learning/courses');
    expect(courses.body.data.items.map((c: { id: string }) => c.id)).toContain('course-raii');
    expect((await request(app).post('/api/learning/courses/course-raii/enroll').set(auth(token))).status).toBe(201);
    expect((await request(app).post('/api/learning/courses/course-raii/enroll').set(auth(token))).status).toBe(201);
    const first = await request(app).post('/api/learning/courses/course-raii/lessons/lesson-raii-1/complete').set(auth(token)).send({});
    expect(first.body.data).toMatchObject({ lessonsCompleted: 1, totalLessons: 3, progress: 33.3, courseCompleted: false });
    await request(app).post('/api/learning/courses/course-raii/lessons/lesson-raii-1/complete').set(auth(token)).send({});
    await request(app).post('/api/learning/courses/course-raii/lessons/lesson-raii-2/complete').set(auth(token)).send({});
    const last = await request(app).post('/api/learning/courses/course-raii/lessons/lesson-raii-3/complete').set(auth(token)).send({});
    expect(last.body.data).toMatchObject({ lessonsCompleted: 3, progress: 100, courseCompleted: true });

    const overview = await request(app).get('/api/learning/progress').set(auth(token));
    expect(overview.body.data.progress[0]).toMatchObject({ courseId: 'course-raii', progress: 100, nextLesson: null });

    // Quiz: answers are hidden before submission, graded server-side, attempts are capped.
    const quiz = await request(app).get('/api/learning/courses/course-raii/lessons/lesson-raii-3/quiz').set(auth(token));
    expect(quiz.status).toBe(200);
    expect(JSON.stringify(quiz.body.data.questions)).not.toContain('"answer"');
    const graded = await request(app)
      .post('/api/learning/courses/course-raii/lessons/lesson-raii-3/quiz/submit')
      .set(auth(token))
      .send({ answers: { q1: 2, q2: 0 } });
    expect(graded.body.data).toMatchObject({ score: 50, correct: 1, total: 2, passed: true, attempt: 1 });

    // Static analysis through the backend (requires the engine).
    if (engineBinary) {
      const analysis = await request(app).post('/api/analysis/analyze').send({ code: 'int main(){ int* p = new int; delete p; }' });
      expect(analysis.status).toBe(200);
      expect(analysis.body.data.diagnostics.map((d: { rule: string }) => d.rule)).toContain('memory/raw-new-delete');

      const submission = await request(app)
        .post('/api/learning/exercises/exercise-raii-1/submissions')
        .set(auth(token))
        .send({ code: 'int answer(){ int* p = new int(42); int v = *p; delete p; return v; }' });
      expect(submission.status).toBe(202);
      expect(submission.body.data.status).toBe('PENDING');
      expect(submission.body.data.feedback).toMatch(/Static analysis found/);
    }

    // Snippets: likes are idempotent, private snippets are invisible to others.
    const snippet = await request(app)
      .post('/api/code/snippets')
      .set(auth(token))
      .send({ title: 'RAII demo', code: 'int main(){}', isPublic: true });
    expect(snippet.status).toBe(201);
    const id: string = snippet.body.data.id;
    await request(app).post(`/api/code/snippets/${id}/like`).set(auth(bob.token));
    const again = await request(app).post(`/api/code/snippets/${id}/like`).set(auth(bob.token));
    expect(again.body.data.likes).toBe(1);
    const secret = await request(app).post('/api/code/snippets').set(auth(token)).send({ title: 'private', code: 'int x;' });
    expect((await request(app).get(`/api/code/snippets/${secret.body.data.id}`).set(auth(bob.token))).status).toBe(404);
    expect((await request(app).delete(`/api/code/snippets/${id}`).set(auth(bob.token))).status).toBe(403);

    // Community: a reply from Bob notifies Ada; reporting is one-per-user.
    const post = await request(app)
      .post('/api/community/posts')
      .set(auth(token))
      .send({ title: 'Why does padding exist?', content: 'Struct sizes surprise me.', categoryId: 'cat-help' });
    expect(post.status).toBe(201);
    const postId: string = post.body.data.id;
    const reply = await request(app).post(`/api/community/posts/${postId}/comments`).set(auth(bob.token)).send({ content: 'Alignment!' });
    expect(reply.status).toBe(201);
    expect((await request(app).post(`/api/community/posts/${postId}/report`).set(auth(bob.token)).send({ reason: 'test report' })).status).toBe(201);
    expect((await request(app).post(`/api/community/posts/${postId}/report`).set(auth(token)).send({ reason: 'self' })).status).toBe(400);
    const viewed = await request(app).get(`/api/community/posts/${postId}`).set(auth(bob.token));
    expect(viewed.body.data).toMatchObject({ views: 1, isLikedByUser: false });

    const notifications = await request(app).get('/api/notifications').set(auth(token));
    const types = notifications.body.data.items.map((n: { type: string }) => n.type);
    expect(types).toEqual(expect.arrayContaining(['COURSE_COMPLETED', 'FORUM_REPLY']));
    expect((await request(app).patch('/api/notifications/read-all').set(auth(token))).body.data.updated).toBeGreaterThanOrEqual(2);
    expect((await request(app).get('/api/notifications/unread-count').set(auth(token))).body.data.count).toBe(0);

    // Authorisation: regular users cannot reach admin endpoints.
    expect((await request(app).get('/api/admin/stats').set(auth(token))).status).toBe(403);

    // Logout revokes the session immediately.
    expect((await request(app).post('/api/auth/logout').set(auth(token))).status).toBe(200);
    expect((await request(app).get('/api/users/me').set(auth(token))).status).toBe(401);
  });
});
