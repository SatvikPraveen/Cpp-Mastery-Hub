import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// In-memory stand-in for the subset of Prisma the session service uses.
interface UserRow {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  deactivationReason: string | null;
  [key: string]: unknown;
}
interface SessionRow {
  id: string;
  userId: string;
  token: string;
  refreshToken: string | null;
  expiresAt: Date;
  isActive: boolean;
}
const db = { users: [] as UserRow[], sessions: [] as SessionRow[] };

jest.mock('../../src/config/database', () => {
  const matchUser = (where: { id?: string; email?: string; OR?: Array<{ email?: string; username?: string }> }) =>
    db.users.find(
      (u) =>
        (where.id !== undefined && u.id === where.id) ||
        (where.email !== undefined && u.email === where.email) ||
        (where.OR ?? []).some((c) => u.email === c.email || u.username === c.username)
    ) ?? null;
  return {
    prisma: {
      user: {
        findFirst: jest.fn(async ({ where }) => matchUser(where)),
        findUnique: jest.fn(async ({ where }) => matchUser(where)),
        create: jest.fn(async ({ data }) => {
          const row = { id: `u${db.users.length + 1}`, isActive: true, deactivationReason: null, ...data } as UserRow;
          db.users.push(row);
          return row;
        }),
        update: jest.fn(async ({ where, data }) => {
          const row = matchUser(where);
          if (!row) throw new Error('not found');
          Object.assign(row, data);
          return row;
        }),
      },
      userSession: {
        create: jest.fn(async ({ data }) => {
          const row = { id: `s${db.sessions.length + 1}`, isActive: true, ...data } as SessionRow;
          db.sessions.push(row);
          return row;
        }),
        findFirst: jest.fn(async ({ where }) => {
          const s = db.sessions.find((x) => x.refreshToken === where.refreshToken && x.isActive && x.expiresAt > new Date());
          return s ? { ...s, user: db.users.find((u) => u.id === s.userId) } : null;
        }),
        update: jest.fn(async ({ where, data }) => {
          const s = db.sessions.find((x) => x.id === where.id);
          if (!s) throw new Error('not found');
          Object.assign(s, data);
          return s;
        }),
        updateMany: jest.fn(async ({ where, data }) => {
          const rows = db.sessions.filter((x) => (where.userId === undefined || x.userId === where.userId) && (where.id === undefined || x.id === where.id) && (where.isActive === undefined || x.isActive === where.isActive));
          rows.forEach((r) => Object.assign(r, data));
          return { count: rows.length };
        }),
      },
    },
  };
});

import { durationSeconds, sessionService } from '../../src/services/auth/session-service';

const client = { ipAddress: '127.0.0.1', userAgent: 'jest' };
const strong = 'Correct-Horse-9';

beforeEach(() => {
  db.users.length = 0;
  db.sessions.length = 0;
});

describe('durationSeconds', () => {
  it.each([
    ['15m', 900],
    ['7d', 604_800],
    ['3600', 3600],
    ['2h', 7200],
  ])('parses %s', (input, expected) => expect(durationSeconds(input)).toBe(expected));

  it('rejects unsupported formats', () => {
    expect(() => durationSeconds('1 week')).toThrow();
  });
});

describe('SessionService', () => {
  it('registers with a bcrypt hash, never the plaintext, and opens a session', async () => {
    const result = await sessionService.register({ username: 'Ada', email: 'ADA@example.com', password: strong }, client);
    const stored = db.users[0]!;
    expect(stored.email).toBe('ada@example.com');
    expect(stored.username).toBe('ada');
    expect(stored.passwordHash).not.toContain(strong);
    expect(await bcrypt.compare(strong, stored.passwordHash)).toBe(true);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(db.sessions).toHaveLength(1);
    expect(result.token).not.toBe(result.refreshToken);
  });

  it('rejects duplicate email or username with 409', async () => {
    await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    await expect(
      sessionService.register({ username: 'other', email: 'ada@example.com', password: strong }, client)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('gives the same error for an unknown user and a wrong password', async () => {
    await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    const expected = { statusCode: 401, message: 'Invalid email or password' };
    await expect(sessionService.login('nobody@example.com', strong, client)).rejects.toMatchObject(expected);
    await expect(sessionService.login('ada@example.com', 'Wrong-Pass-1', client)).rejects.toMatchObject(expected);
  });

  it('refuses login for banned accounts', async () => {
    await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    Object.assign(db.users[0]!, { isActive: false, deactivationReason: 'banned: spam' });
    await expect(sessionService.login('ada', strong, client)).rejects.toMatchObject({ statusCode: 403, message: 'Account suspended' });
  });

  it('issues distinct tokens for concurrent logins', async () => {
    await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    const [a, b] = await Promise.all([sessionService.login('ada', strong, client), sessionService.login('ada', strong, client)]);
    expect(a.token).not.toBe(b.token);
    expect(a.refreshToken).not.toBe(b.refreshToken);
  });

  it('rotates refresh tokens and revokes everything when an old one is reused', async () => {
    const first = await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    await sessionService.login('ada', strong, client); // a second device
    const rotated = await sessionService.refresh(first.refreshToken);
    expect(rotated.refreshToken).not.toBe(first.refreshToken);

    await expect(sessionService.refresh(first.refreshToken)).rejects.toMatchObject({ statusCode: 401 });
    expect(db.sessions.every((s) => !s.isActive)).toBe(true);
  });

  it('rejects refresh tokens signed with the access secret', async () => {
    await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    const forged = jwt.sign({ userId: 'u1', type: 'refresh' }, process.env['JWT_SECRET']!, {
      issuer: 'cpp-mastery-hub',
      audience: 'cpp-mastery-users',
    });
    await expect(sessionService.refresh(forged)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('makes password-reset tokens single-use and revokes sessions', async () => {
    await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    const reset = await sessionService.createPasswordResetToken('ada@example.com');
    expect(reset).not.toBeNull();

    await sessionService.resetPassword(reset!.token, 'Brand-New-Pass-2');
    expect(await bcrypt.compare('Brand-New-Pass-2', db.users[0]!.passwordHash)).toBe(true);
    expect(db.sessions.every((s) => !s.isActive)).toBe(true);

    await expect(sessionService.resetPassword(reset!.token, 'Third-Pass-3')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('does not create reset tokens for unknown addresses', async () => {
    await expect(sessionService.createPasswordResetToken('ghost@example.com')).resolves.toBeNull();
  });

  it('rejects a reset token whose subject was swapped to another user', async () => {
    await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    await sessionService.register({ username: 'bob', email: 'bob@example.com', password: strong }, client);
    const { token } = (await sessionService.createPasswordResetToken('ada@example.com'))!;
    const [header, , signature] = token.split('.');
    const payload = Buffer.from(JSON.stringify({ sub: 'u2', purpose: 'password-reset' })).toString('base64url');
    await expect(sessionService.resetPassword(`${header}.${payload}.${signature}`, 'Hijack-Pass-4')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('email verification', () => {
  it('verifies once, is idempotent, and is bound to the address', async () => {
    const { user } = await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    const token = sessionService.createEmailVerificationToken(user);

    const verified = await sessionService.verifyEmail(token);
    expect(verified.isVerified).toBe(true);
    await expect(sessionService.verifyEmail(token)).resolves.toMatchObject({ isVerified: true });

    const stale = sessionService.createEmailVerificationToken(user);
    db.users[0]!.email = 'new@example.com';
    db.users[0]!.isVerified = false;
    await expect(sessionService.verifyEmail(stale)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a password-reset token used as a verification token', async () => {
    await sessionService.register({ username: 'ada', email: 'ada@example.com', password: strong }, client);
    const { token } = (await sessionService.createPasswordResetToken('ada@example.com'))!;
    await expect(sessionService.verifyEmail(token)).rejects.toMatchObject({ statusCode: 400 });
  });
});
