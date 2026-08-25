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
import {
  type AuthenticatedRequest,
  readCookie,
} from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { SetActiveOrganizationDto } from './dto/set-active-organization.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';
import { TeamService } from './team.service';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly team: TeamService,
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

  @Get(':id/members')
  async listMembers(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const members = await this.team.listMembers(userId, id);
    return { members };
  }

  @Patch(':id/members/:memberId')
  async changeMemberRole(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() body: UpdateMemberRoleDto,
  ) {
    const userId = this.requireUserId(request);
    const member = await this.team.changeMemberRole(
      userId,
      id,
      memberId,
      body.role,
    );
    return { member };
  }

  @Delete(':id/members/:memberId')
  @HttpCode(200)
  async removeMember(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const userId = this.requireUserId(request);
    return this.team.removeMember(userId, id, memberId);
  }

  @Get(':id/invitations')
  async listInvitations(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const invitations = await this.team.listInvitations(userId, id);
    return { invitations };
  }

  @Post(':id/invitations')
  async createInvitation(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateInvitationDto,
  ) {
    const userId = this.requireUserId(request);
    const invitation = await this.team.createInvitation(userId, id, body);
    return { invitation };
  }

  @Delete(':id/invitations/:invitationId')
  @HttpCode(200)
  async cancelInvitation(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    const userId = this.requireUserId(request);
    return this.team.cancelInvitation(userId, id, invitationId);
  }

  @Post(':id/transfer-ownership')
  @HttpCode(200)
  async transferOwnership(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TransferOwnershipDto,
  ) {
    const userId = this.requireUserId(request);
    return this.team.transferOwnership(userId, id, body.memberId);
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

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly team: TeamService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get('preview')
  async preview(@Query('token') token?: string) {
    const invitation = await this.team.previewInvitation(token ?? '');
    return { invitation };
  }

  @Post('accept')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async accept(
    @Req() request: AuthenticatedRequest,
    @Body() body: AcceptInvitationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = request.authUser?.id;
    if (!userId) {
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Authentication required.',
        401,
      );
    }
    const result = await this.team.acceptInvitation(userId, body.token);
    this.cookies.setActiveOrganization(response, result.organizationId);
    return { member: result.member, organizationId: result.organizationId };
  }
}
