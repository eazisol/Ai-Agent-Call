import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from '../auth/auth-cookie.service';
import {
  type AuthenticatedRequest,
  readCookie,
} from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import { KnowledgeService } from './knowledge.service';

@Controller('agents/:agentId/knowledge')
@UseGuards(AuthGuard)
export class AgentKnowledgeController {
  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Param('agentId', ParseUUIDPipe) agentId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const assignments = await this.knowledge.listAgentKnowledge(
      userId,
      organizationId,
      businessId,
      agentId,
    );
    return { assignments };
  }

  @Post(':knowledgeId')
  @HttpCode(201)
  async assign(
    @Req() request: AuthenticatedRequest,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('knowledgeId', ParseUUIDPipe) knowledgeId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const assignment = await this.knowledge.assignToAgent(
      userId,
      organizationId,
      businessId,
      agentId,
      knowledgeId,
    );
    return { assignment };
  }

  @Delete(':knowledgeId')
  @HttpCode(200)
  async unassign(
    @Req() request: AuthenticatedRequest,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Param('knowledgeId', ParseUUIDPipe) knowledgeId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.knowledge.unassignFromAgent(
      userId,
      organizationId,
      businessId,
      agentId,
      knowledgeId,
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
        'Select an active organization before managing knowledge.',
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
        'Select an active business before managing knowledge.',
        400,
      );
    }
    return businessId;
  }
}
