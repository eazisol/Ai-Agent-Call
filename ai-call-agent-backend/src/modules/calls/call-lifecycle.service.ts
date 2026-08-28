import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import type { OrganizationMemberRole } from '../organizations/entities/organization-member.entity';
import { canViewProviderLinks } from './call-permissions';
import type { ResolvedRoutingContext, RoutingFailure } from './call-routing.types';
import {
  CallEvent,
  type CallEventSource,
  type CallEventType,
} from './entities/call-event.entity';
import { CallProviderMapping } from './entities/call-provider-mapping.entity';
import { Call, CallStatus, type CallDirection } from './entities/call.entity';
import { ProviderEvent } from './entities/provider-event.entity';

export type CreateInboundCallInput = {
  twilioCallSid: string;
  callerNumber?: string;
  receiverNumber?: string;
  direction?: CallDirection;
  businessId?: string | null;
  agentId?: string | null;
  phoneNumberId?: string | null;
  status?: CallStatus;
  failureCode?: string | null;
  failureStage?: string | null;
};

export type CallListQuery = {
  status?: CallStatus;
  direction?: CallDirection;
  agentId?: string;
  page?: number;
  limit?: number;
};

export type CallListItemView = {
  id: string;
  direction: CallDirection | null;
  status: CallStatus;
  callerNumber: string | null;
  receiverNumber: string | null;
  businessId: string | null;
  agentId: string | null;
  agentName: string | null;
  phoneNumberId: string | null;
  failureCode: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  duration: number | null;
  providerLinks?: {
    twilioCallSid: string;
    elevenLabsConversationId: string | null;
  };
};

@Injectable()
export class CallLifecycleService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(CallEvent)
    private readonly callEventRepository: Repository<CallEvent>,
    @InjectRepository(CallProviderMapping)
    private readonly mappingRepository: Repository<CallProviderMapping>,
    @InjectRepository(ProviderEvent)
    private readonly providerEventRepository: Repository<ProviderEvent>,
    private readonly dataSource: DataSource,
  ) {}

  async findExistingByTwilioSid(callSid: string): Promise<Call | null> {
    const mapping = await this.mappingRepository.findOne({
      where: { provider: 'twilio', externalCallId: callSid },
      relations: {
        call: {
          agent: true,
          business: true,
          phoneNumber: true,
          providerMappings: true,
        },
      },
    });
    return mapping?.call ?? null;
  }

  async createInboundCall(input: CreateInboundCallInput): Promise<Call> {
    const existing = await this.findExistingByTwilioSid(input.twilioCallSid);
    if (existing) {
      return existing;
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const call = manager.create(Call, {
          twilioCallSid: input.twilioCallSid,
          callerNumber: input.callerNumber,
          receiverNumber: input.receiverNumber,
          direction: input.direction ?? 'inbound',
          business: input.businessId ? ({ id: input.businessId } as Call['business']) : null,
          agent: input.agentId ? ({ id: input.agentId } as Call['agent']) : null,
          phoneNumber: input.phoneNumberId
            ? ({ id: input.phoneNumberId } as Call['phoneNumber'])
            : null,
          status: input.status ?? CallStatus.STARTED,
          failureCode: input.failureCode ?? null,
          failureStage: input.failureStage ?? null,
          startedAt: new Date(),
          endedAt:
            input.status === CallStatus.FAILED ? new Date() : undefined,
        });
        const saved = await manager.save(call);
        await manager.save(
          manager.create(CallProviderMapping, {
            call: saved,
            provider: 'twilio',
            externalCallId: input.twilioCallSid,
          }),
        );
        return saved;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const concurrent = await this.findExistingByTwilioSid(input.twilioCallSid);
        if (concurrent) {
          return concurrent;
        }
      }
      throw error;
    }
  }

  async createFromProvider(data: {
    provider: string;
    externalCallId: string;
    callerNumber?: string;
    receiverNumber?: string;
  }): Promise<Call> {
    if (data.provider === 'twilio') {
      return this.createInboundCall({
        twilioCallSid: data.externalCallId,
        callerNumber: data.callerNumber,
        receiverNumber: data.receiverNumber,
      });
    }

    const existing = await this.mappingRepository.findOne({
      where: {
        provider: data.provider,
        externalCallId: data.externalCallId,
      },
      relations: { call: true },
    });
    if (existing) {
      return existing.call;
    }

    return this.createInboundCall({
      twilioCallSid: data.externalCallId,
      callerNumber: data.callerNumber,
      receiverNumber: data.receiverNumber,
    });
  }

  async appendCallEvent(input: {
    callId: string;
    eventType: CallEventType;
    source: CallEventSource;
    externalEventId?: string | null;
    payload?: Record<string, unknown>;
    occurredAt?: Date;
  }): Promise<boolean> {
    if (input.externalEventId) {
      const exists = await this.callEventRepository.exists({
        where: {
          callId: input.callId,
          eventType: input.eventType,
          source: input.source,
          externalEventId: input.externalEventId,
        },
      });
      if (exists) {
        return false;
      }
    }

    try {
      await this.callEventRepository.save(
        this.callEventRepository.create({
          callId: input.callId,
          eventType: input.eventType,
          source: input.source,
          externalEventId: input.externalEventId ?? null,
          payload: input.payload ?? {},
          occurredAt: input.occurredAt ?? new Date(),
        }),
      );
      return true;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  async markInProgress(provider: string, externalCallId: string): Promise<void> {
    const call = await this.findCallByProviderMapping(provider, externalCallId);
    if (!call || this.isTerminal(call.status)) {
      return;
    }
    if (call.status === CallStatus.IN_PROGRESS) {
      return;
    }
    await this.callRepository.update(call.id, {
      status: CallStatus.IN_PROGRESS,
    });
  }

  async markCompleted(
    provider: string,
    externalCallId: string,
    duration?: number,
  ): Promise<void> {
    const call = await this.findCallByProviderMapping(provider, externalCallId);
    if (!call || this.isTerminal(call.status)) {
      return;
    }
    await this.callRepository.update(call.id, {
      status: CallStatus.COMPLETED,
      endedAt: new Date(),
      duration,
    });
    await this.appendCallEvent({
      callId: call.id,
      eventType: 'CALL_COMPLETED',
      source: provider === 'twilio' ? 'twilio' : 'elevenlabs',
      externalEventId: `${externalCallId}:completed`,
    });
  }

  async markFailed(
    provider: string,
    externalCallId: string,
    reason?: string,
    failureCode?: string,
  ): Promise<void> {
    const call = await this.findCallByProviderMapping(provider, externalCallId);
    if (!call || this.isTerminal(call.status)) {
      return;
    }
    await this.callRepository.update(call.id, {
      status: CallStatus.FAILED,
      endedAt: new Date(),
      failureCode: failureCode ?? call.failureCode,
      ...(reason ? { conclusion: reason } : {}),
    });
    await this.appendCallEvent({
      callId: call.id,
      eventType: 'CALL_FAILED',
      source: provider === 'twilio' ? 'twilio' : 'elevenlabs',
      externalEventId: `${externalCallId}:failed`,
      payload: reason ? { reason } : {},
    });
  }

  async linkProviderCallId(
    callId: string,
    provider: string,
    externalCallId: string,
  ): Promise<void> {
    const exists = await this.mappingRepository.exists({
      where: { provider, externalCallId },
    });
    if (exists) {
      return;
    }
    try {
      await this.mappingRepository.save(
        this.mappingRepository.create({
          call: { id: callId } as Call,
          provider,
          externalCallId,
        }),
      );
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }
    }
  }

  async recordProviderEvent(input: {
    provider: string;
    externalEventId: string;
    eventType: string;
    payload: Record<string, string>;
    call?: Call;
  }): Promise<boolean> {
    const exists = await this.providerEventRepository.exists({
      where: {
        provider: input.provider,
        externalEventId: input.externalEventId,
      },
    });
    if (exists) {
      return false;
    }

    const normalizedPayload = JSON.stringify(
      Object.entries(input.payload).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
    try {
      await this.providerEventRepository.save(
        this.providerEventRepository.create({
          provider: input.provider,
          externalEventId: input.externalEventId,
          eventType: input.eventType,
          payloadHash: createHash('sha256')
            .update(normalizedPayload)
            .digest('hex'),
          call: input.call,
        }),
      );
      return true;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  async listForBusiness(
    businessId: string,
    role: OrganizationMemberRole,
    query: CallListQuery,
  ): Promise<{ items: CallListItemView[]; page: number; limit: number; total: number }> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const qb = this.callRepository
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.agent', 'agent')
      .leftJoinAndSelect('call.business', 'business')
      .leftJoinAndSelect('call.phoneNumber', 'phoneNumber')
      .leftJoinAndSelect('call.providerMappings', 'providerMappings')
      .where('call.business_id = :businessId', { businessId });

    if (query.status) {
      qb.andWhere('call.status = :status', { status: query.status });
    }
    if (query.direction) {
      qb.andWhere('call.direction = :direction', { direction: query.direction });
    } else {
      qb.andWhere('call.direction = :defaultDirection', {
        defaultDirection: 'inbound',
      });
    }
    if (query.agentId) {
      qb.andWhere('call.agent_id = :agentId', { agentId: query.agentId });
    }

    qb.orderBy('call.started_at', 'DESC', 'NULLS LAST')
      .addOrderBy('call.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((row) => this.toListItem(row, role)),
      page,
      limit,
      total,
    };
  }

  async getForBusiness(
    businessId: string,
    callId: string,
    role: OrganizationMemberRole,
  ): Promise<{ call: CallListItemView; events: Array<{
    eventType: CallEventType;
    source: CallEventSource;
    occurredAt: Date;
    payload: Record<string, unknown>;
  }> }> {
    const call = await this.callRepository.findOne({
      where: { id: callId, business: { id: businessId } },
      relations: { agent: true, phoneNumber: true, providerMappings: true, business: true },
    });
    if (!call) {
      throw new ApplicationError(
        'CALL_NOT_FOUND',
        'Call not found.',
        404,
      );
    }

    const events = await this.callEventRepository.find({
      where: { callId: call.id },
      order: { occurredAt: 'ASC' },
      take: 50,
    });

    return {
      call: this.toListItem(call, role),
      events: events.map((event) => ({
        eventType: event.eventType,
        source: event.source,
        occurredAt: event.occurredAt,
        payload: event.payload,
      })),
    };
  }

  async persistRoutingFailure(
    input: {
      twilioCallSid: string;
      callerNumber?: string;
      receiverNumber?: string;
      failure: RoutingFailure;
    },
  ): Promise<Call> {
    return this.createInboundCall({
      twilioCallSid: input.twilioCallSid,
      callerNumber: input.callerNumber,
      receiverNumber: input.receiverNumber,
      businessId: input.failure.businessId ?? null,
      agentId: input.failure.agentId ?? null,
      phoneNumberId: input.failure.phoneNumberId ?? null,
      status: CallStatus.FAILED,
      failureCode: input.failure.code,
      failureStage: input.failure.stage,
    });
  }

  async persistSuccessfulRouting(
    input: {
      twilioCallSid: string;
      callerNumber?: string;
      receiverNumber?: string;
      context: ResolvedRoutingContext;
    },
  ): Promise<Call> {
    return this.createInboundCall({
      twilioCallSid: input.twilioCallSid,
      callerNumber: input.callerNumber,
      receiverNumber: input.receiverNumber,
      businessId: input.context.businessId,
      agentId: input.context.agentId,
      phoneNumberId: input.context.phoneNumberId,
      status: CallStatus.STARTED,
    });
  }

  private toListItem(call: Call, role: OrganizationMemberRole): CallListItemView {
    const item: CallListItemView = {
      id: call.id,
      direction: call.direction,
      status: call.status,
      callerNumber: call.callerNumber ?? null,
      receiverNumber: call.receiverNumber ?? null,
      businessId: call.business?.id ?? null,
      agentId: call.agent?.id ?? null,
      agentName: call.agent?.name ?? null,
      phoneNumberId: call.phoneNumber?.id ?? null,
      failureCode: call.failureCode,
      startedAt: call.startedAt ?? null,
      endedAt: call.endedAt ?? null,
      duration: call.duration ?? null,
    };

    if (canViewProviderLinks(role)) {
      item.providerLinks = {
        twilioCallSid: call.twilioCallSid,
        elevenLabsConversationId:
          call.providerMappings?.find((m) => m.provider === 'elevenlabs')
            ?.externalCallId ?? null,
      };
    }

    return item;
  }

  private async findCallByProviderMapping(
    provider: string,
    externalCallId: string,
  ): Promise<Call | null> {
    const mapping = await this.mappingRepository.findOne({
      where: { provider, externalCallId },
      relations: { call: true },
    });
    return mapping?.call ?? null;
  }

  private isTerminal(status: CallStatus): boolean {
    return status === CallStatus.COMPLETED || status === CallStatus.FAILED;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('driverError' in error)) {
      return false;
    }
    const driverError = (error as { driverError?: unknown }).driverError;
    return (
      driverError !== null &&
      driverError !== undefined &&
      typeof driverError === 'object' &&
      'code' in driverError &&
      (driverError as { code?: string }).code === '23505'
    );
  }
}
