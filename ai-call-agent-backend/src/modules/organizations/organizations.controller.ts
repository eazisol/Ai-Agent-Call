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
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthCookieService } from '../auth/auth-cookie.service';
import {
  type AuthenticatedRequest,
  readCookie,
} from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import { ApplicationError } from '../../common/errors/application-error';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { SetActiveOrganizationDto } from './dto/set-active-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateOrganizationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = this.requireUserId(request);
    const organization = await this.organizations.create(userId, body);
    this.cookies.setActiveOrganization(response, organization.id);
    return { organization };
  }

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    const userId = this.requireUserId(request);
    const organizations = await this.organizations.listForUser(userId);
    return { organizations };
  }

  @Get('active')
  async getActive(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = readCookie(
      request,
      this.cookies.activeOrganizationCookieName(),
    );
    if (!organizationId) {
      return { organization: null };
    }

    try {
      const organization = await this.organizations.getForUser(
        userId,
        organizationId,
      );
      return { organization };
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        error.code === 'ORGANIZATION_NOT_FOUND'
      ) {
        this.cookies.clearActiveOrganization(response);
        return { organization: null };
      }
      throw error;
    }
  }

  @Post('active')
  @HttpCode(200)
  async setActive(
    @Req() request: AuthenticatedRequest,
    @Body() body: SetActiveOrganizationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = this.requireUserId(request);
    const organization = await this.organizations.getForUser(
      userId,
      body.organizationId,
    );
    this.cookies.setActiveOrganization(response, organization.id);
    return { organization };
  }

  @Delete('active')
  @HttpCode(200)
  clearActive(@Res({ passthrough: true }) response: Response) {
    this.cookies.clearActiveOrganization(response);
    return { cleared: true };
  }

  @Get(':id')
  async getOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organization = await this.organizations.getForUser(userId, id);
    return { organization };
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrganizationDto,
  ) {
    const userId = this.requireUserId(request);
    const organization = await this.organizations.updateForOwner(
      userId,
      id,
      body,
    );
    return { organization };
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
}
