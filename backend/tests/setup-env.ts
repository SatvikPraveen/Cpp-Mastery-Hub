// Runs before every test file, before any application module is imported. The config module
// validates the environment at import time, so required variables must exist here.
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error';
process.env['DATABASE_URL'] ??= 'postgresql://test:test@localhost:5432/test';
process.env['POSTGRES_PASSWORD'] ??= 'test';
process.env['JWT_SECRET'] = 'test-access-secret-0123456789abcdef0123456789';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-0123456789abcdef012345678';
process.env['SESSION_SECRET'] = 'test-session-secret-0123456789abcdef01234567';
process.env['CPP_ENGINE_URL'] ??= 'http://127.0.0.1:9';
process.env['CPP_ENGINE_TIMEOUT'] ??= '2000';
// Minimum bcrypt cost keeps hashing tests fast; production uses the configured default (12).
process.env['BCRYPT_ROUNDS'] = '4';
// Tests use the in-memory cache and rate-limit stores.
delete process.env['REDIS_URL'];
