const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const { AuthController } = require('../dist/modules/auth/auth.controller');
const { AuthService } = require('../dist/modules/auth/auth.service');
const {
  AuthCookieService,
} = require('../dist/modules/auth/auth-cookie.service');
const { AuthGuard } = require('../dist/modules/auth/auth.guard');
const {
  AuthRateLimitGuard,
} = require('../dist/modules/auth/auth-rate-limit.guard');
const {
  AuthRateLimitService,
} = require('../dist/modules/auth/auth-rate-limit.service');
const {
  GlobalExceptionFilter,
} = require('../dist/common/filters/global-exception.filter');
const { ConfigService } = require('@nestjs/config');

function rateLimitProviders(max = 20) {
  return [
    AuthRateLimitService,
    AuthRateLimitGuard,
    {
      provide: ConfigService,
      useValue: {
        get: (key) => {
          const values = {
            'auth.accessCookieName': 'eazi_access',
            'auth.refreshCookieName': 'eazi_refresh',
            'auth.accessTtlSeconds': 900,
            'auth.refreshTtlSeconds': 2592000,
            'auth.cookieSecure': false,
            'auth.cookieSameSite': 'lax',
            'auth.rateLimitMax': max,
            'auth.rateLimitWindowMs': 60_000,
            'app.nodeEnv': 'test',
          };
          return values[key];
        },
      },
    },
  ];
}

test('register rejects invalid payload with VALIDATION_ERROR', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      {
        provide: AuthService,
        useValue: {
          register: async () => ({ user: { id: 'x' } }),
        },
      },
      {
        provide: AuthCookieService,
        useValue: {
          accessCookieName: () => 'eazi_access',
          refreshCookieName: () => 'eazi_refresh',
          setSession: () => undefined,
          clearSession: () => undefined,
        },
      },
      {
        provide: AuthGuard,
        useValue: { canActivate: () => true },
      },
      ...rateLimitProviders(),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email: 'not-an-email', password: 'short', displayName: '' })
    .expect(400);

  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  await app.close();
});

test('login sets session cookies when AuthService returns tokens', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      {
        provide: AuthService,
        useValue: {
          login: async () => ({
            user: {
              id: '11111111-1111-4111-8111-111111111111',
              email: 'user@example.com',
              displayName: 'User',
              emailVerifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            accessToken: 'access-token-value',
            refreshToken: 'refresh-token-value',
          }),
        },
      },
      AuthCookieService,
      {
        provide: AuthGuard,
        useValue: { canActivate: () => true },
      },
      ...rateLimitProviders(),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: 'user@example.com', password: 'correct-horse' })
    .expect(200);

  assert.equal(response.body.user.email, 'user@example.com');
  const cookies = response.headers['set-cookie'] ?? [];
  assert.equal(
    cookies.some((value) => value.startsWith('eazi_access=')),
    true,
  );
  assert.equal(
    cookies.some((value) => value.startsWith('eazi_refresh=')),
    true,
  );
  await app.close();
});

test('unauthenticated /auth/me is rejected', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      {
        provide: AuthService,
        useValue: {
          meFromAccessToken: async () => {
            throw new Error('should not be called');
          },
          refreshSession: async () => {
            throw new Error('should not be called');
          },
        },
      },
      AuthCookieService,
      AuthGuard,
      ...rateLimitProviders(),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const response = await request(app.getHttpServer())
    .get('/api/v1/auth/me')
    .expect(401);

  assert.equal(response.body.error.code, 'UNAUTHENTICATED');
  await app.close();
});

test('auth login rate limit returns RATE_LIMITED', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      {
        provide: AuthService,
        useValue: {
          login: async () => ({
            user: {
              id: '11111111-1111-4111-8111-111111111111',
              email: 'user@example.com',
              displayName: 'User',
              emailVerifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            accessToken: 'access-token-value',
            refreshToken: 'refresh-token-value',
          }),
        },
      },
      AuthCookieService,
      {
        provide: AuthGuard,
        useValue: { canActivate: () => true },
      },
      ...rateLimitProviders(2),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const server = app.getHttpServer();
  await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'user@example.com', password: 'correct-horse' })
    .expect(200);
  await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'user@example.com', password: 'correct-horse' })
    .expect(200);

  const limited = await request(server)
    .post('/api/v1/auth/login')
    .send({ email: 'user@example.com', password: 'correct-horse' })
    .expect(429);

  assert.equal(limited.body.error.code, 'RATE_LIMITED');
  await app.close();
});
