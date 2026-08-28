const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { ValidationPipe } = require('@nestjs/common');
const {
  OrganizationsController,
  InvitationsController,
} = require('../dist/modules/organizations/organizations.controller');
const {
  OrganizationsService,
} = require('../dist/modules/organizations/organizations.service');
const { TeamService } = require('../dist/modules/organizations/team.service');
const {
  AuthCookieService,
} = require('../dist/modules/auth/auth-cookie.service');
const { AuthGuard } = require('../dist/modules/auth/auth.guard');
const {
  GlobalExceptionFilter,
} = require('../dist/common/filters/global-exception.filter');
const { ConfigService } = require('@nestjs/config');

const sampleOrg = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Acme',
  slug: 'acme',
  role: 'owner',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const sampleMember = {
  id: '44444444-4444-4444-8444-444444444444',
  userId: '55555555-5555-4555-8555-555555555555',
  email: 'viewer@example.com',
  displayName: 'Viewer',
  role: 'viewer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const sampleInvitation = {
  id: '66666666-6666-4666-8666-666666666666',
  email: 'invitee@example.com',
  role: 'viewer',
  invitedByUserId: '22222222-2222-4222-8222-222222222222',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  createdAt: new Date().toISOString(),
};

async function createApp(serviceOverrides = {}, teamOverrides = {}) {
  const moduleRef = await Test.createTestingModule({
    controllers: [OrganizationsController, InvitationsController],
    providers: [
      {
        provide: OrganizationsService,
        useValue: {
          create: async () => sampleOrg,
          listForUser: async () => [sampleOrg],
          getForUser: async (_userId, id) => {
            if (id !== sampleOrg.id) {
              const {
                ApplicationError,
              } = require('../dist/common/errors/application-error');
              throw new ApplicationError(
                'ORGANIZATION_NOT_FOUND',
                'Organization not found.',
                404,
              );
            }
            return sampleOrg;
          },
          updateForOwner: async () => ({ ...sampleOrg, name: 'Acme Updated' }),
          ...serviceOverrides,
        },
      },
      {
        provide: TeamService,
        useValue: {
          listMembers: async () => [sampleMember],
          createInvitation: async () => sampleInvitation,
          changeMemberRole: async () => ({ ...sampleMember, role: 'manager' }),
          removeMember: async () => ({ removed: true }),
          listInvitations: async () => [sampleInvitation],
          cancelInvitation: async () => ({ cancelled: true }),
          transferOwnership: async () => ({
            previousOwner: { ...sampleMember, role: 'admin' },
            newOwner: { ...sampleMember, role: 'owner' },
          }),
          previewInvitation: async () => ({
            status: 'valid',
            organizationId: sampleOrg.id,
            organizationName: sampleOrg.name,
            invitedEmail: 'invitee@example.com',
            emailMasked: 'i***@example.com',
            role: 'viewer',
            invitedByDisplayName: 'Owner',
            expiresAt: sampleInvitation.expiresAt,
            expired: false,
            accountState: 'new',
          }),
          acceptInvitation: async () => ({
            member: sampleMember,
            organizationId: sampleOrg.id,
            alreadyMember: false,
          }),
          ...teamOverrides,
        },
      },
      AuthCookieService,
      {
        provide: ConfigService,
        useValue: {
          get: (key) => {
            const values = {
              'auth.orgCookieName': 'eazi_org',
              'auth.refreshTtlSeconds': 2592000,
              'auth.cookieSecure': false,
              'auth.cookieSameSite': 'lax',
              'app.nodeEnv': 'test',
            };
            return values[key];
          },
        },
      },
      {
        provide: AuthGuard,
        useValue: {
          canActivate: (context) => {
            const request = context.switchToHttp().getRequest();
            request.authUser = {
              id: '22222222-2222-4222-8222-222222222222',
              email: 'user@example.com',
              displayName: 'User',
              emailVerifiedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            return true;
          },
        },
      },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (context) => {
        const request = context.switchToHttp().getRequest();
        request.authUser = {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'user@example.com',
          displayName: 'User',
          emailVerifiedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();
  return app;
}

test('POST /organizations creates and sets active org cookie', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/organizations')
    .send({ name: 'Acme' })
    .expect(201);

  assert.equal(response.body.organization.slug, 'acme');
  const cookies = response.headers['set-cookie'] ?? [];
  assert.equal(
    cookies.some((value) => value.startsWith('eazi_org=')),
    true,
  );
  await app.close();
});

test('GET /organizations lists membership-scoped organizations', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/organizations')
    .expect(200);
  assert.equal(response.body.organizations.length, 1);
  await app.close();
});

test('GET /organizations/:id returns 404 for unknown org', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .get('/api/v1/organizations/33333333-3333-4333-8333-333333333333')
    .expect(404);
  assert.equal(response.body.error.code, 'ORGANIZATION_NOT_FOUND');
  await app.close();
});

test('PATCH /organizations/:id updates settings', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .patch(`/api/v1/organizations/${sampleOrg.id}`)
    .send({ name: 'Acme Updated' })
    .expect(200);
  assert.equal(response.body.organization.name, 'Acme Updated');
  await app.close();
});

test('POST /organizations/active sets cookie after membership check', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/organizations/active')
    .send({ organizationId: sampleOrg.id })
    .expect(200);
  assert.equal(response.body.organization.id, sampleOrg.id);
  const cookies = response.headers['set-cookie'] ?? [];
  assert.equal(
    cookies.some((value) => value.startsWith(`eazi_org=${sampleOrg.id}`)),
    true,
  );
  await app.close();
});

test('create organization rejects empty name with VALIDATION_ERROR', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post('/api/v1/organizations')
    .send({ name: '' })
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  await app.close();
});

test('unauthenticated organization list is rejected', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [OrganizationsController],
    providers: [
      {
        provide: OrganizationsService,
        useValue: {
          listForUser: async () => {
            throw new Error('should not be called');
          },
        },
      },
      {
        provide: TeamService,
        useValue: {},
      },
      AuthCookieService,
      {
        provide: ConfigService,
        useValue: {
          get: () => undefined,
        },
      },
      AuthGuard,
      {
        provide: require('../dist/modules/auth/auth.service').AuthService,
        useValue: {
          meFromAccessToken: async () => {
            throw new Error('no token');
          },
          refreshSession: async () => {
            throw new Error('no refresh');
          },
        },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  const response = await request(app.getHttpServer())
    .get('/api/v1/organizations')
    .expect(401);
  assert.equal(response.body.error.code, 'UNAUTHENTICATED');
  await app.close();
});

test('team member and invitation routes return contract shapes', async () => {
  const app = await createApp();
  const members = await request(app.getHttpServer())
    .get(`/api/v1/organizations/${sampleOrg.id}/members`)
    .expect(200);
  assert.equal(members.body.members[0].role, 'viewer');

  const invite = await request(app.getHttpServer())
    .post(`/api/v1/organizations/${sampleOrg.id}/invitations`)
    .send({ email: 'invitee@example.com', role: 'viewer' })
    .expect(201);
  assert.equal(invite.body.invitation.email, 'invitee@example.com');

  const patched = await request(app.getHttpServer())
    .patch(`/api/v1/organizations/${sampleOrg.id}/members/${sampleMember.id}`)
    .send({ role: 'manager' })
    .expect(200);
  assert.equal(patched.body.member.role, 'manager');

  await request(app.getHttpServer())
    .delete(`/api/v1/organizations/${sampleOrg.id}/members/${sampleMember.id}`)
    .expect(200);

  const preview = await request(app.getHttpServer())
    .get('/api/v1/invitations/preview')
    .query({ token: 'opaque-token-value' })
    .expect(200);
  assert.equal(preview.body.invitation.organizationName, 'Acme');

  const accept = await request(app.getHttpServer())
    .post('/api/v1/invitations/accept')
    .send({ token: 'opaque-token-value' })
    .expect(200);
  assert.equal(accept.body.organizationId, sampleOrg.id);
  await app.close();
});

test('invitation DTO rejects owner role', async () => {
  const app = await createApp();
  const response = await request(app.getHttpServer())
    .post(`/api/v1/organizations/${sampleOrg.id}/invitations`)
    .send({ email: 'x@example.com', role: 'owner' })
    .expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  await app.close();
});

test('PATCH returns FORBIDDEN when service denies non-owner', async () => {
  const {
    ApplicationError,
  } = require('../dist/common/errors/application-error');
  const app = await createApp({
    updateForOwner: async () => {
      throw new ApplicationError(
        'FORBIDDEN',
        'Only organization owners can update settings.',
        403,
      );
    },
  });
  const response = await request(app.getHttpServer())
    .patch(`/api/v1/organizations/${sampleOrg.id}`)
    .send({ name: 'Nope' })
    .expect(403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
  await app.close();
});

test('team RBAC denials surface FORBIDDEN / LAST_OWNER / ORGANIZATION_NOT_FOUND', async () => {
  const {
    ApplicationError,
  } = require('../dist/common/errors/application-error');
  const app = await createApp(
    {},
    {
      changeMemberRole: async () => {
        throw new ApplicationError(
          'FORBIDDEN',
          'You cannot assign that role.',
          403,
        );
      },
      removeMember: async () => {
        throw new ApplicationError(
          'LAST_OWNER',
          'Cannot remove the last owner. Transfer ownership first.',
          409,
        );
      },
      listMembers: async () => {
        throw new ApplicationError(
          'ORGANIZATION_NOT_FOUND',
          'Organization not found.',
          404,
        );
      },
    },
  );

  const forbidden = await request(app.getHttpServer())
    .patch(`/api/v1/organizations/${sampleOrg.id}/members/${sampleMember.id}`)
    .send({ role: 'admin' })
    .expect(403);
  assert.equal(forbidden.body.error.code, 'FORBIDDEN');

  const lastOwner = await request(app.getHttpServer())
    .delete(`/api/v1/organizations/${sampleOrg.id}/members/${sampleMember.id}`)
    .expect(409);
  assert.equal(lastOwner.body.error.code, 'LAST_OWNER');

  const missing = await request(app.getHttpServer())
    .get(`/api/v1/organizations/${sampleOrg.id}/members`)
    .expect(404);
  assert.equal(missing.body.error.code, 'ORGANIZATION_NOT_FOUND');
  await app.close();
});
