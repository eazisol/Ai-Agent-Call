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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from '../auth/auth-cookie.service';
import {
  type AuthenticatedRequest,
  readCookie,
} from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import {
  CreateKnowledgeFaqDto,
  CreateKnowledgeTextDto,
  CreateKnowledgeUrlDto,
  UpdateKnowledgeDto,
} from './dto/knowledge.dto';
import { KnowledgeSyncService } from './knowledge-sync.service';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
@UseGuards(AuthGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly knowledgeSync: KnowledgeSyncService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const sources = await this.knowledge.listForUser(
      userId,
      organizationId,
      businessId,
      includeArchived === 'true' || includeArchived === '1',
    );
    return { sources };
  }

  @Post('files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async createFile(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('name') name?: string,
    @Body('description') description?: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const source = await this.knowledge.createFile(
      userId,
      organizationId,
      businessId,
      file,
      name,
      description,
    );
    return { source };
  }

  @Post('url')
  async createUrl(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateKnowledgeUrlDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const source = await this.knowledge.createUrl(
      userId,
      organizationId,
      businessId,
      body,
    );
    return { source };
  }

  @Post('text')
  async createText(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateKnowledgeTextDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const source = await this.knowledge.createText(
      userId,
      organizationId,
      businessId,
      body,
    );
    return { source };
  }

  @Post('faq')
  async createFaq(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateKnowledgeFaqDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const source = await this.knowledge.createFaq(
      userId,
      organizationId,
      businessId,
      body,
    );
    return { source };
  }

  @Get(':id')
  async getOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const source = await this.knowledge.getForUser(
      userId,
      organizationId,
      businessId,
      id,
    );
    return { source };
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateKnowledgeDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const source = await this.knowledge.updateForUser(
      userId,
      organizationId,
      businessId,
      id,
      body,
    );
    return { source };
  }

  @Post(':id/archive')
  @HttpCode(200)
  async archive(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const source = await this.knowledge.archiveForUser(
      userId,
      organizationId,
      businessId,
      id,
    );
    return { source };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.knowledge.deleteForUser(
      userId,
      organizationId,
      businessId,
      id,
    );
  }

  @Post(':id/sync')
  @HttpCode(200)
  async sync(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.knowledgeSync.syncForUser(
      userId,
      organizationId,
      businessId,
      id,
    );
  }

  @Post(':id/resync')
  @HttpCode(200)
  async resync(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.knowledgeSync.resyncForUser(
      userId,
      organizationId,
      businessId,
      id,
    );
  }

  @Get(':id/provider-status')
  async providerStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const status = await this.knowledgeSync.getStatusForUser(
      userId,
      organizationId,
      businessId,
      id,
    );
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
