const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const { IsNull, MoreThan } = require('typeorm');
const { AuthService } = require('../../dist/modules/auth/auth.service');
const {
  AuthTokenService,
} = require('../../dist/modules/auth/auth-token.service');
const {
  PasswordService,
} = require('../../dist/modules/auth/password.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

const configValues = {
  'auth.jwtAccessSecret': 'test-auth-jwt-access-secret-32chars-min',
  'auth.accessTtlSeconds': 900,
  'auth.refreshTtlSeconds': 2592000,
  'auth.verificationTtlSeconds': 86400,
  'auth.resetTtlSeconds': 3600,
  'auth.bcryptRounds': 10,
  'auth.publicAppUrl': 'http://localhost:3001',
};

const config = {
  get: (key) => configValues[key],
  getOrThrow: (key) => {
    if (configValues[key] === undefined) {
      throw new Error(`missing ${key}`);
    }
    return configValues[key];
  },
};

function matchCondition(actual, expected) {
  if (expected && typeof expected === 'object' && expected['@instanceof']) {
    const type = expected._type;
    if (type === 'isNull') {
      return actual == null;
    }
    if (type === 'moreThan') {
      return actual > expected._value;
    }
  }
  if (expected && typeof expected === 'object' && expected.type) {
    if (expected.type === 'isNull') {
      return actual == null;
    }
    if (expected.type === 'moreThan') {
      return actual > expected.value;
    }
  }
  return actual === expected;
}

function createMemoryRepo(seed = []) {
  const rows = seed.map((row) => ({ ...row }));

  return {
    rows,
    create: (data) => ({
      id: data.id ?? randomUUID(),
      ...data,
    }),
    save: async (entity) => {
      const list = Array.isArray(entity) ? entity : [entity];
      for (const item of list) {
        if (!item.id) {
          item.id = randomUUID();
        }
        const index = rows.findIndex((row) => row.id === item.id);
        if (index >= 0) {
          rows[index] = { ...rows[index], ...item };
        } else {
          rows.push({ ...item });
        }
      }
      return Array.isArray(entity) ? list : list[0];
    },
    findOne: async ({ where = {}, relations } = {}) => {
      const found = rows.find((row) =>
        Object.entries(where).every(([key, value]) =>
          matchCondition(row[key], value),
        ),
      );
      if (!found) {
        return null;
      }
      const clone = { ...found };
      if (relations?.user && found.userId) {
        clone.user = found.user;
      }
      if (relations?.user && found.user) {
        clone.user = found.user;
      }
      return clone;
    },
    createQueryBuilder: () => {
      const state = {
        values: {},
        filters: [],
      };
      const builder = {
        update: () => builder,
        set: (values) => {
          state.values = values;
          return builder;
        },
        where: (clause, params = {}) => {
          state.filters.push({ clause, params });
          return builder;
        },
        andWhere: (clause, params = {}) => {
          state.filters.push({ clause, params });
          return builder;
        },
        execute: async () => {
          for (const row of rows) {
            let ok = true;
            for (const filter of state.filters) {
              if (
                filter.clause.includes('user_id = :userId') &&
                row.user?.id !== filter.params.userId &&
                row.userId !== filter.params.userId
              ) {
                ok = false;
              }
              if (
                filter.clause.includes('consumed_at IS NULL') &&
                row.consumedAt != null
              ) {
                ok = false;
              }
              if (
                filter.clause.includes('revoked_at IS NULL') &&
                row.revokedAt != null
              ) {
                ok = false;
              }
            }
            if (ok) {
              Object.assign(row, state.values);
            }
          }
          return { affected: rows.length };
        },
      };
      return builder;
    },
  };
}

function createHarness() {
  const users = createMemoryRepo();
  const refreshTokens = createMemoryRepo();
  const emailVerificationTokens = createMemoryRepo();
  const passwordResetTokens = createMemoryRepo();
  const sent = [];

  // Attach user relation on save for token tables
  const wrapTokenRepo = (repo) => {
    const originalSave = repo.save;
    repo.save = async (entity) => {
      const saved = await originalSave(entity);
      const list = Array.isArray(saved) ? saved : [saved];
      for (const item of list) {
        if (item.user && !item.userId) {
          item.userId = item.user.id;
        }
        const row = repo.rows.find((r) => r.id === item.id);
        if (row && item.user) {
          row.user = item.user;
          row.userId = item.user.id;
        }
      }
      return saved;
    };
    const originalFindOne = repo.findOne;
    repo.findOne = async (options = {}) => {
      const found = await originalFindOne(options);
      if (!found) {
        return null;
      }
      if (options.relations?.user) {
        const user =
          found.user ||
          users.rows.find((u) => u.id === found.userId || u.id === found.user?.id);
        if (user) {
          found.user = user;
        }
      }
      return found;
    };
    return repo;
  };

  wrapTokenRepo(refreshTokens);
  wrapTokenRepo(emailVerificationTokens);
  wrapTokenRepo(passwordResetTokens);

  const emailDelivery = {
    providerName: 'test',
    send: async (message) => {
      sent.push(message);
    },
  };

  const auth = new AuthService(
    users,
    refreshTokens,
    emailVerificationTokens,
    passwordResetTokens,
    new PasswordService(config),
    new AuthTokenService(config),
    emailDelivery,
    config,
  );

  return {
    auth,
    users,
    refreshTokens,
    emailVerificationTokens,
    passwordResetTokens,
    sent,
  };
}

function tokenFromLink(htmlOrText) {
  const match = String(htmlOrText).match(/token=([^"&\s]+)/);
  assert.ok(match, 'expected token in email link');
  return decodeURIComponent(match[1]);
}

test('register → verify → login → me → logout journey', async () => {
  const { auth, refreshTokens, sent } = createHarness();

  const registered = await auth.register({
    email: 'Alex@Example.com',
    password: 'correct-horse-battery',
    displayName: 'Alex',
  });
  assert.equal(registered.user.email, 'alex@example.com');
  assert.equal(registered.user.emailVerifiedAt, null);
  assert.equal(sent.length, 1);

  await assert.rejects(
    () =>
      auth.login({
        email: 'alex@example.com',
        password: 'correct-horse-battery',
      }),
    (error) => error instanceof ApplicationError && error.code === 'EMAIL_NOT_VERIFIED',
  );

  const verifyToken = tokenFromLink(sent[0].text);
  const verified = await auth.verifyEmail(verifyToken);
  assert.ok(verified.user.emailVerifiedAt);

  const session = await auth.login({
    email: 'alex@example.com',
    password: 'correct-horse-battery',
  });
  assert.ok(session.accessToken);
  assert.ok(session.refreshToken);

  const me = await auth.meFromAccessToken(session.accessToken);
  assert.equal(me.id, registered.user.id);
  assert.equal(me.email, 'alex@example.com');

  await auth.logout(session.refreshToken);
  const stored = refreshTokens.rows.find(
    (row) => row.tokenHash === new AuthTokenService(config).hashOpaqueToken(session.refreshToken),
  );
  assert.ok(stored?.revokedAt);
});

test('duplicate email registration is rejected', async () => {
  const { auth } = createHarness();
  await auth.register({
    email: 'dup@example.com',
    password: 'correct-horse-battery',
    displayName: 'One',
  });

  await assert.rejects(
    () =>
      auth.register({
        email: 'DUP@example.com',
        password: 'correct-horse-battery',
        displayName: 'Two',
      }),
    (error) =>
      error instanceof ApplicationError && error.code === 'EMAIL_ALREADY_REGISTERED',
  );
});

test('invalid credentials are rejected without revealing account existence', async () => {
  const { auth, sent } = createHarness();
  await auth.register({
    email: 'user@example.com',
    password: 'correct-horse-battery',
    displayName: 'User',
  });
  const verifyToken = tokenFromLink(sent[0].text);
  await auth.verifyEmail(verifyToken);

  await assert.rejects(
    () =>
      auth.login({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_CREDENTIALS',
  );

  await assert.rejects(
    () =>
      auth.login({
        email: 'missing@example.com',
        password: 'correct-horse-battery',
      }),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_CREDENTIALS',
  );
});

test('expired or invalid reset tokens are rejected', async () => {
  const { auth } = createHarness();

  await assert.rejects(
    () => auth.resetPassword('not-a-real-token', 'new-password-ok'),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_RESET_TOKEN',
  );

  // Force an expired token row
  const harness = createHarness();
  const user = await harness.users.save(
    harness.users.create({
      email: 'reset@example.com',
      passwordHash: await new PasswordService(config).hash('old-password'),
      displayName: 'Reset',
      emailVerifiedAt: new Date(),
    }),
  );
  const tokens = new AuthTokenService(config);
  const raw = tokens.createOpaqueToken();
  await harness.passwordResetTokens.save(
    harness.passwordResetTokens.create({
      user,
      userId: user.id,
      tokenHash: tokens.hashOpaqueToken(raw),
      expiresAt: new Date(Date.now() - 60_000),
      consumedAt: null,
    }),
  );

  await assert.rejects(
    () => harness.auth.resetPassword(raw, 'new-password-ok'),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_RESET_TOKEN',
  );

  // IsNull / MoreThan operators used by production queries still construct
  assert.ok(IsNull());
  assert.ok(MoreThan(new Date()));
});

test('access token subject cannot resolve a different user identity', async () => {
  const { auth, sent } = createHarness();
  await auth.register({
    email: 'owner@example.com',
    password: 'correct-horse-battery',
    displayName: 'Owner',
  });
  await auth.verifyEmail(tokenFromLink(sent[0].text));
  const session = await auth.login({
    email: 'owner@example.com',
    password: 'correct-horse-battery',
  });
  const me = await auth.meFromAccessToken(session.accessToken);
  assert.equal(me.email, 'owner@example.com');

  await assert.rejects(
    () => auth.meFromAccessToken('tampered.token.value'),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_ACCESS_TOKEN',
  );
});

test('access tokens expire according to configured TTL', async () => {
  const shortConfig = {
    get: (key) => (key === 'auth.accessTtlSeconds' ? 1 : configValues[key]),
    getOrThrow: (key) => {
      if (key === 'auth.accessTtlSeconds') {
        return 1;
      }
      return config.getOrThrow(key);
    },
  };
  const tokens = new AuthTokenService(shortConfig);
  const token = tokens.createAccessToken({
    sub: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
  });
  assert.equal(tokens.verifyAccessToken(token).email, 'user@example.com');
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.throws(
    () => tokens.verifyAccessToken(token),
    (error) =>
      error instanceof ApplicationError && error.code === 'INVALID_ACCESS_TOKEN',
  );
});
