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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApplicationError } from '../../common/errors/application-error';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { type AuthenticatedRequest, readCookie } from '../auth/auth-request';
import { AuthGuard } from '../auth/auth.guard';
import {
  CreateVoiceCloneDto,
  ListVoiceClonesQueryDto,
  RecordVoiceCloneConsentDto,
} from './dto/voice-clones.dto';
import { VoiceClonesService } from './voice-clones.service';

@Controller('voices/clones')
@UseGuards(AuthGuard)
export class VoiceClonesController {
  constructor(
    private readonly voiceClones: VoiceClonesService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListVoiceClonesQueryDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.voiceClones.listForUser(
      userId,
      organizationId,
      businessId,
      query,
    );
  }

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateVoiceCloneDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const clone = await this.voiceClones.createDraftForUser(
      userId,
      organizationId,
      businessId,
      body,
    );
    return { clone };
  }

  @Get(':id')
  async get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) cloneId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const clone = await this.voiceClones.getForUser(
      userId,
      organizationId,
      businessId,
      cloneId,
    );
    return { clone };
  }

  @Get(':id/status')
  async status(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) cloneId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.voiceClones.getStatusForUser(
      userId,
      organizationId,
      businessId,
      cloneId,
    );
  }

  @Post(':id/samples')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  async uploadSample(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) cloneId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.voiceClones.uploadSampleForUser(
      userId,
      organizationId,
      businessId,
      cloneId,
      file,
    );
  }

  @Delete(':id/samples/:sampleId')
  @HttpCode(204)
  async deleteSample(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) cloneId: string,
    @Param('sampleId', ParseUUIDPipe) sampleId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    await this.voiceClones.deleteSampleForUser(
      userId,
      organizationId,
      businessId,
      cloneId,
      sampleId,
    );
  }

  @Post(':id/consent')
  async recordConsent(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) cloneId: string,
    @Body() body: RecordVoiceCloneConsentDto,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    return this.voiceClones.recordConsentForUser(
      userId,
      organizationId,
      businessId,
      cloneId,
      body,
      {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    );
  }

  @Post(':id/submit')
  async submit(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) cloneId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const clone = await this.voiceClones.submitForUser(
      userId,
      organizationId,
      businessId,
      cloneId,
    );
    return { clone };
  }

  @Post(':id/retry')
  async retry(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) cloneId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const clone = await this.voiceClones.retryForUser(
      userId,
      organizationId,
      businessId,
      cloneId,
    );
    return { clone };
  }

  @Post(':id/revoke')
  async revoke(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) cloneId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    const clone = await this.voiceClones.revokeForUser(
      userId,
      organizationId,
      businessId,
      cloneId,
    );
    return { clone };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) cloneId: string,
  ) {
    const userId = this.requireUserId(request);
    const organizationId = this.requireActiveOrganization(request);
    const businessId = this.requireActiveBusiness(request);
    await this.voiceClones.deleteForUser(
      userId,
      organizationId,
      businessId,
      cloneId,
    );
    return { deleted: true };
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
        'Select an active organization before managing voice clones.',
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
        'Select an active business before managing voice clones.',
        400,
      );
    }
    return businessId;
  }
}
