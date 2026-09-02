import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { type AuthenticatedRequest, readCookie } from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import { OrganizationsService } from '../organizations/organizations.service';
import { assertCallCan } from './call-permissions';
import { CallLifecycleService } from './call-lifecycle.service';
import { ListCallsQueryDto } from './dto/calls.dto';

@Controller('calls')
@UseGuards(AuthGuard)
export class CallsController {
  constructor(
    private readonly lifecycle: CallLifecycleService,
    private readonly organizations: OrganizationsService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListCallsQueryDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertCallCan(membership.role, 'list_calls');
    return this.lifecycle.listForBusiness(businessId, membership.role, query);
  }

  @Get(':id')
  async get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const membership = await this.organizations.requireMembership(
      userId,
      organizationId,
    );
    assertCallCan(membership.role, 'view_call');
    return this.lifecycle.getForBusiness(businessId, id, membership.role);
  }

  private requireUserId(request: AuthenticatedRequest): string {
    if (!request.authUser?.id) {
      throw new ApplicationError(
        'UNAUTHORIZED',
        'Authentication required.',
        401,
      );
    }
    return request.authUser.id;
  }

  private requireActiveOrganization(request: AuthenticatedRequest): string {
    const organizationId = readCookie(
      request,
      this.cookies.activeOrganizationCookieName(),
    );
    if (!organizationId) {
      throw new ApplicationError(
        'ACTIVE_ORGANIZATION_REQUIRED',
        'Select an active organization.',
        400,
      );
    }
    return organizationId;
  }

  private requireActiveBusiness(request: AuthenticatedRequest): string {
    const businessId = readCookie(
      request,
      this.cookies.activeBusinessCookieName(),
    );
    if (!businessId) {
      throw new ApplicationError(
        'ACTIVE_BUSINESS_REQUIRED',
        'Select an active business.',
        400,
      );
    }
    return businessId;
  }
}
