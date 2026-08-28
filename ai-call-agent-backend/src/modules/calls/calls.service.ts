import { Injectable } from '@nestjs/common';
import { CallLifecycleService } from './call-lifecycle.service';
import { Call } from './entities/call.entity';

/** @deprecated Prefer CallLifecycleService directly in new code. */
@Injectable()
export class CallsService {
  constructor(private readonly lifecycle: CallLifecycleService) {}

  createFromProvider(
    data: Parameters<CallLifecycleService['createFromProvider']>[0],
  ): Promise<Call> {
    return this.lifecycle.createFromProvider(data);
  }

  createFromTwilio(data: {
    twilioCallSid: string;
    callerNumber?: string;
    receiverNumber?: string;
  }): Promise<Call> {
    return this.lifecycle.createInboundCall({
      twilioCallSid: data.twilioCallSid,
      callerNumber: data.callerNumber,
      receiverNumber: data.receiverNumber,
    });
  }

  markCompleted(
    provider: string,
    externalCallId: string,
    duration?: number,
  ): Promise<void> {
    return this.lifecycle.markCompleted(provider, externalCallId, duration);
  }

  markFailed(
    provider: string,
    externalCallId: string,
    reason?: string,
  ): Promise<void> {
    return this.lifecycle.markFailed(provider, externalCallId, reason);
  }

  recordProviderEvent(
    input: Parameters<CallLifecycleService['recordProviderEvent']>[0],
  ): Promise<boolean> {
    return this.lifecycle.recordProviderEvent(input);
  }

  findAll(): Promise<Call[]> {
    throw new Error(
      'Prototype findAll is disabled. Use tenant-scoped GET /calls.',
    );
  }

  findOne(_id: string): Promise<Call | null> {
    throw new Error(
      'Prototype findOne is disabled. Use tenant-scoped GET /calls/:id.',
    );
  }
}
