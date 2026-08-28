import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { type AuthenticatedRequest, readCookie } from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { SetActiveBusinessDto } from './dto/set-active-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('businesses')
@UseGuards(AuthGuard)
export class BusinessesController {
  constructor(
    private readonly businesses: BusinessesService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateBusinessDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const business = await this.businesses.create(userId, organizationId, body);
    this.cookies.setActiveBusiness(response, business.id);
    return { business };
  }

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businesses = await this.businesses.listForUser(
      userId,
      organizationId,
      includeArchived === 'true' || includeArchived === '1',
    );
    return { businesses };
  }

  @Get('active')
  async getActive(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = readCookie(
      request,
      this.cookies.activeBusinessCookieName(),
    );
    if (!businessId) {
      return { business: null };
    }

    try {
      const business = await this.businesses.resolveActiveForUser(
        userId,
        organizationId,
        businessId,
      );
      return { business };
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        (error.code === 'BUSINESS_NOT_FOUND' ||
          error.code === 'BUSINESS_ARCHIVED' ||
          error.code === 'ORGANIZATION_NOT_FOUND')
      ) {
        this.cookies.clearActiveBusiness(response);
        return { business: null };
      }
      throw error;
    }
  }

  @Post('active')
  @HttpCode(200)
  async setActive(
    @Req() request: AuthenticatedRequest,
    @Body() body: SetActiveBusinessDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const business = await this.businesses.resolveActiveForUser(
      userId,
      organizationId,
      body.businessId,
    );
    this.cookies.setActiveBusiness(response, business.id);
    return { business };
  }

  @Delete('active')
  @HttpCode(200)
  clearActive(@Res({ passthrough: true }) response: Response) {
    this.cookies.clearActiveBusiness(response);
    return { cleared: true };
  }

  @Post(':id/archive')
  @HttpCode(200)
  async archive(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const business = await this.businesses.archiveForUser(
      userId,
      organizationId,
      id,
    );
    const activeId = readCookie(
      request,
      this.cookies.activeBusinessCookieName(),
    );
    if (activeId === id) {
      this.cookies.clearActiveBusiness(response);
    }
    return { business };
  }

  @Get(':id')
  async getOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const business = await this.businesses.getForUser(
      userId,
      organizationId,
      id,
    );
    return { business };
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBusinessDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const business = await this.businesses.updateForUser(
      userId,
      organizationId,
      id,
      body,
    );
    if (business.status === 'archived') {
      const activeId = readCookie(
        request,
        this.cookies.activeBusinessCookieName(),
      );
      if (activeId === id) {
        this.cookies.clearActiveBusiness(response);
      }
    }
    return { business };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const result = await this.businesses.deleteForUser(
      userId,
      organizationId,
      id,
    );
    const activeId = readCookie(
      request,
      this.cookies.activeBusinessCookieName(),
    );
    if (activeId === id) {
      this.cookies.clearActiveBusiness(response);
    }
    return result;
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
        'Select an active organization before managing businesses.',
        400,
      );
    }
    return organizationId;
  }
}
