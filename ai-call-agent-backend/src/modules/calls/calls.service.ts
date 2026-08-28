import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { Call, CallStatus } from './entities/call.entity';
import { CallProviderMapping } from './entities/call-provider-mapping.entity';
import { ProviderEvent } from './entities/provider-event.entity';

interface ProviderCallInput {
  provider: string;
  externalCallId: string;
  callerNumber?: string;
  receiverNumber?: string;
}

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(CallProviderMapping)
    private readonly mappingRepository: Repository<CallProviderMapping>,
    @InjectRepository(ProviderEvent)
    private readonly eventRepository: Repository<ProviderEvent>,
    private readonly dataSource: DataSource,
  ) {}

  async createFromProvider(data: ProviderCallInput): Promise<Call> {
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

    try {
      return await this.dataSource.transaction(async (manager) => {
        const call = manager.create(Call, {
          twilioCallSid: data.externalCallId,
          callerNumber: data.callerNumber,
          receiverNumber: data.receiverNumber,
          status: CallStatus.STARTED,
          startedAt: new Date(),
        });
        const savedCall = await manager.save(call);
        await manager.save(
          manager.create(CallProviderMapping, {
            call: savedCall,
            provider: data.provider,
            externalCallId: data.externalCallId,
          }),
        );
        return savedCall;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const concurrent = await this.mappingRepository.findOne({
          where: {
            provider: data.provider,
            externalCallId: data.externalCallId,
          },
          relations: { call: true },
        });
        if (concurrent) {
          return concurrent.call;
        }
      }
      throw error;
    }
  }

  createFromTwilio(data: {
    twilioCallSid: string;
    callerNumber?: string;
    receiverNumber?: string;
  }): Promise<Call> {
    return this.createFromProvider({
      provider: 'twilio',
      externalCallId: data.twilioCallSid,
      callerNumber: data.callerNumber,
      receiverNumber: data.receiverNumber,
    });
  }

  async markCompleted(
    provider: string,
    externalCallId: string,
    duration?: number,
  ): Promise<void> {
    const mapping = await this.mappingRepository.findOne({
      where: { provider, externalCallId },
      relations: { call: true },
    });

    if (!mapping) {
      return;
    }

    await this.callRepository.update(mapping.call.id, {
      status: CallStatus.COMPLETED,
      endedAt: new Date(),
      duration,
    });
  }

  async markFailed(
    provider: string,
    externalCallId: string,
    reason?: string,
  ): Promise<void> {
    const mapping = await this.mappingRepository.findOne({
      where: { provider, externalCallId },
      relations: { call: true },
    });

    if (!mapping) {
      return;
    }

    await this.callRepository.update(mapping.call.id, {
      status: CallStatus.FAILED,
      endedAt: new Date(),
      ...(reason ? { conclusion: reason } : {}),
    });
  }

  async recordProviderEvent(input: {
    provider: string;
    externalEventId: string;
    eventType: string;
    payload: Record<string, string>;
    call?: Call;
  }): Promise<boolean> {
    const exists = await this.eventRepository.exists({
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
      await this.eventRepository.save(
        this.eventRepository.create({
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

  findAll(): Promise<Call[]> {
    return this.callRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string): Promise<Call | null> {
    return this.callRepository.findOne({
      where: { id },
      relations: {
        messages: true,
        recordings: true,
        providerMappings: true,
      },
    });
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
