import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { type AuthenticatedRequest, readCookie } from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import {
  AssignAgentVoiceDto,
  ListVoicesQueryDto,
  PreviewVoiceDto,
} from './dto/voices.dto';
import { VoicesService } from './voices.service';

@Controller('voices')
@UseGuards(AuthGuard)
export class VoicesController {
  constructor(
    private readonly voices: VoicesService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListVoicesQueryDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.voices.listForUser(userId, organizationId, businessId, query);
  }

  @Get(':id')
  async get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) voiceId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const voice = await this.voices.getForUser(
      userId,
      organizationId,
      businessId,
      voiceId,
    );
    return { voice };
  }

  @Post(':id/preview')
  @HttpCode(200)
  async preview(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) voiceId: string,
    @Body() body: PreviewVoiceDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const preview = await this.voices.previewForUser(
      userId,
      organizationId,
      businessId,
      voiceId,
      body.sampleText,
    );
    return { preview };
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
        'Select an active organization before managing voices.',
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
        'Select an active business before managing voices.',
        400,
      );
    }
    return businessId;
  }
}

@Controller('agents/:agentId/voice')
@UseGuards(AuthGuard)
export class AgentVoiceController {
  constructor(
    private readonly voices: VoicesService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get()
  async get(
    @Req() request: AuthenticatedRequest,
    @Param('agentId', ParseUUIDPipe) agentId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const assignment = await this.voices.getAgentVoiceForUser(
      userId,
      organizationId,
      businessId,
      agentId,
    );
    return { assignment };
  }

  @Put()
  async assign(
    @Req() request: AuthenticatedRequest,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: AssignAgentVoiceDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const assignment = await this.voices.assignAgentVoiceForUser(
      userId,
      organizationId,
      businessId,
      agentId,
      body.voiceId,
    );
    return { assignment };
  }

  @Post()
  @HttpCode(200)
  async assignPost(
    @Req() request: AuthenticatedRequest,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() body: AssignAgentVoiceDto,
  ) {
    return this.assign(request, agentId, body);
  }

  @Delete()
  @HttpCode(200)
  async clear(
    @Req() request: AuthenticatedRequest,
    @Param('agentId', ParseUUIDPipe) agentId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const assignment = await this.voices.clearAgentVoiceForUser(
      userId,
      organizationId,
      businessId,
      agentId,
    );
    return { assignment };
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
        'Select an active organization before managing agent voice.',
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
        'Select an active business before managing agent voice.',
        400,
      );
    }
    return businessId;
  }
}
