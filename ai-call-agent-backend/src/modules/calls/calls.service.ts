import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Call, CallStatus } from './entities/call.entity';

@Injectable()
export class CallsService {
    constructor(
        @InjectRepository(Call)
        private readonly callRepository: Repository<Call>,
    ) { }

    async createFromTwilio(data: {
        twilioCallSid: string;
        callerNumber?: string;
        receiverNumber?: string;
    }): Promise<Call> {
        const existingCall = await this.callRepository.findOne({
            where: { twilioCallSid: data.twilioCallSid },
        });

        if (existingCall) {
            return existingCall;
        }

        const call = this.callRepository.create({
            twilioCallSid: data.twilioCallSid,
            callerNumber: data.callerNumber,
            receiverNumber: data.receiverNumber,
            status: CallStatus.STARTED,
            startedAt: new Date(),
        });

        return this.callRepository.save(call);
    }

    async markCompleted(twilioCallSid: string, duration?: number): Promise<void> {
        await this.callRepository.update(
            { twilioCallSid },
            {
                status: CallStatus.COMPLETED,
                endedAt: new Date(),
                duration,
            },
        );
    }

    async findAll(): Promise<Call[]> {
        return this.callRepository.find({
            order: {
                createdAt: 'DESC',
            },
        });
    }

    async findOne(id: string): Promise<Call | null> {
        return this.callRepository.findOne({
            where: { id },
        });
    }
}