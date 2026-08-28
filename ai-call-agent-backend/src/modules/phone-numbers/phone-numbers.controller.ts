import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { type AuthenticatedRequest, readCookie } from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import {
  AssignPhoneNumberDto,
  ImportPhoneNumberDto,
  ListPhoneNumbersQueryDto,
  PurchasePhoneNumberDto,
  ReleasePhoneNumberDto,
  SearchPhoneNumbersDto,
} from './dto/phone-numbers.dto';
import { PhoneNumbersService } from './phone-numbers.service';

@Controller('phone-numbers')
@UseGuards(AuthGuard)
export class PhoneNumbersController {
  constructor(
    private readonly phoneNumbers: PhoneNumbersService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListPhoneNumbersQueryDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.phoneNumbers.listForUser(
      userId,
      organizationId,
      businessId,
      query,
    );
  }

  @Get(':id')
  async get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const phoneNumber = await this.phoneNumbers.getForUser(
      userId,
      organizationId,
      businessId,
      id,
    );
    return { phoneNumber };
  }

  @Post('search')
  @HttpCode(200)
  async search(
    @Req() request: AuthenticatedRequest,
    @Body() body: SearchPhoneNumbersDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.phoneNumbers.searchForUser(
      userId,
      organizationId,
      businessId,
      body,
    );
  }

  @Post('purchase')
  async purchase(
    @Req() request: AuthenticatedRequest,
    @Body() body: PurchasePhoneNumberDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.phoneNumbers.purchaseForUser(
      userId,
      organizationId,
      businessId,
      body,
    );
  }

  @Post('import')
  async importNumber(
    @Req() request: AuthenticatedRequest,
    @Body() body: ImportPhoneNumberDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.phoneNumbers.importForUser(
      userId,
      organizationId,
      businessId,
      body,
    );
  }

  @Post(':id/assign')
  @HttpCode(200)
  async assign(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignPhoneNumberDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.phoneNumbers.assignForUser(
      userId,
      organizationId,
      businessId,
      id,
      body,
    );
  }

  @Post(':id/unassign')
  @HttpCode(200)
  async unassign(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.phoneNumbers.unassignForUser(
      userId,
      organizationId,
      businessId,
      id,
    );
  }

  @Delete(':id')
  @HttpCode(200)
  async release(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReleasePhoneNumberDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.phoneNumbers.releaseForUser(
      userId,
      organizationId,
      businessId,
      id,
      body,
    );
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
        'Select an active organization before managing phone numbers.',
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
        'Select an active business before managing phone numbers.',
        400,
      );
    }
    return businessId;
  }
}
