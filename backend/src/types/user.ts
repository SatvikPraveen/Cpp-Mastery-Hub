import type { User } from '@prisma/client';

export { UserRole } from '@prisma/client';
export type { User } from '@prisma/client';

/** A user record that is safe to serialise to clients (no credential material). */
export type SafeUser = Omit<User, 'passwordHash'>;

export function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}
