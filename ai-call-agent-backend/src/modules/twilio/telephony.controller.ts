import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { type AuthenticatedRequest, readCookie } from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import { OrganizationsService } from '../organizations/organizations.service';
import { assertCanViewTelephonyProviderStatus } from './telephony-permissions';
import { TelephonyStatusService } from './telephony-status.service';

@Controller('telephony')
@UseGuards(AuthGuard)
export class TelephonyController {
  constructor(
    private readonly telephonyStatus: TelephonyStatusService,
    private readonly organizations: OrganizationsService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get('provider-status')
  async providerStatus(@Req() request: AuthenticatedRequest) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertCanViewTelephonyProviderStatus(membership.role);

    const status = await this.telephonyStatus.getProviderStatus();
    return { status };
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
        'ACTIVE_ORGANIZATION_REQUIRED',
        'Select an organization to continue.',
        400,
      );
    }
    return organizationId;
  }
}
