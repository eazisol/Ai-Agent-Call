import {
  Controller,
  Get,
  Header,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { type AuthenticatedRequest, readCookie } from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import { OrganizationsService } from '../organizations/organizations.service';
import { EntitlementsService } from './entitlements.service';
import { assertPlanCan } from './plan-permissions';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';

@Controller()
export class PublicPlansController {
  constructor(private readonly plans: PlansService) {}

  @Get('public/plans')
  @Header('Cache-Control', 'public, max-age=300')
  async listPublic() {
    const plans = await this.plans.listPublicPlans();
    return { plans };
  }
}

@Controller()
@UseGuards(AuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly plans: PlansService,
    private readonly subscriptions: SubscriptionsService,
    private readonly entitlements: EntitlementsService,
    private readonly organizations: OrganizationsService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get('plans')
  async listPlans(@Req() request: AuthenticatedRequest) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPlanCan(membership.role, 'view_plans');

    const subscription =
      await this.subscriptions.getOrEnsureForOrganization(organizationId);
    const plans = await this.plans.listCustomerVisiblePlans(
      subscription.plan.code,
    );
    return { plans };
  }

  @Get('subscription')
  async getSubscription(@Req() request: AuthenticatedRequest) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPlanCan(membership.role, 'view_subscription');

    const subscription =
      await this.subscriptions.getViewForOrganization(organizationId);
    return subscription;
  }

  @Get('subscription/entitlements')
  async getEntitlements(@Req() request: AuthenticatedRequest) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertPlanCan(membership.role, 'view_entitlements');

    const resolved =
      await this.entitlements.getResolvedEntitlements(organizationId);
    return {
      organizationId: resolved.organizationId,
      planCode: resolved.planCode,
      status: resolved.status,
      entitlements: resolved.entitlements,
      features: resolved.features,
      limits: resolved.limits,
    };
  }

  private requireUserId(request: AuthenticatedRequest): string {
    const userId = request.authUser?.id;
    if (!userId) {
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Authentication required.',
        401,
      );
    }
    return userId;
  }

  private requireActiveOrganization(request: AuthenticatedRequest): string {
    const organizationId = readCookie(
      request,
      this.cookies.activeOrganizationCookieName(),
    );
    if (!organizationId) {
      throw new ApplicationError(
        'ORGANIZATION_REQUIRED',
        'Select an active organization before continuing.',
        400,
      );
    }
    return organizationId;
  }
}
