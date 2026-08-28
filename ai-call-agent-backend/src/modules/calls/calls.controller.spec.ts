import { Test, TestingModule } from '@nestjs/testing';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CallLifecycleService } from './call-lifecycle.service';
import { CallsController } from './calls.controller';

describe('CallsController', () => {
  let controller: CallsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallsController],
      providers: [
        {
          provide: CallLifecycleService,
          useValue: {
            listForBusiness: jest.fn(),
            getForBusiness: jest.fn(),
          },
        },
        {
          provide: OrganizationsService,
          useValue: { requireMembership: jest.fn() },
        },
        {
          provide: AuthCookieService,
          useValue: {
            activeOrganizationCookieName: () => 'eazi_org',
            activeBusinessCookieName: () => 'eazi_biz',
          },
        },
      ],
    }).compile();

    controller = module.get(CallsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
