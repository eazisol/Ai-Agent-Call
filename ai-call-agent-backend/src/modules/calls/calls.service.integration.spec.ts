import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions, Repository } from 'typeorm';
import { newDb } from 'pg-mem';

import { Business } from '../businesses/entities/business.entity';
import { AiConfig } from '../openai-realtime/entities/ai-config.entity';
import { CallMessage } from './entities/call-message.entity';
import { CallRecording } from './entities/call-recording.entity';
import { Call, CallStatus } from './entities/call.entity';
import { EmailLog } from './entities/email-log.entity';
import { CallsService } from './calls.service';

describe('CallsService integration', () => {
  let moduleRef: TestingModule;
  let service: CallsService;
  let callRepository: Repository<Call>;

  beforeEach(async () => {
    const db = newDb({
      autoCreateForeignKeyIndices: true,
    });

    db.public.registerFunction({
      name: 'current_database',
      returns: 'text',
      implementation: () => 'eaziaicall_test',
    });
    db.public.registerFunction({
      name: 'version',
      returns: 'text',
      implementation: () => 'PostgreSQL 16.0 (pg-mem)',
    });
    db.public.registerFunction({
      name: 'quote_ident',
      args: ['text'],
      returns: 'text',
      implementation: (value: string) => value,
    });
    db.public.registerFunction({
      name: 'obj_description',
      args: ['regclass', 'text'],
      returns: 'text',
      implementation: () => null,
    });
    db.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: 'uuid',
      implementation: () => randomUUID(),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const dataSource: DataSource = db.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: [
        Business,
        AiConfig,
        Call,
        CallMessage,
        CallRecording,
        EmailLog,
      ],
      synchronize: true,
    });
    const dataSourceOptions: DataSourceOptions = dataSource.options;

    await dataSource.initialize();

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: () => dataSourceOptions,
          dataSourceFactory: () => Promise.resolve(dataSource),
        }),
        TypeOrmModule.forFeature([Call]),
      ],
      providers: [CallsService],
    }).compile();

    service = moduleRef.get(CallsService);
    callRepository = moduleRef.get<Repository<Call>>(getRepositoryToken(Call));
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  it('is idempotent for the same Twilio Call SID', async () => {
    const firstCall = await service.createFromTwilio({
      twilioCallSid: 'CA-int-1',
      callerNumber: '+15550001111',
      receiverNumber: '+15550002222',
    });

    const secondCall = await service.createFromTwilio({
      twilioCallSid: 'CA-int-1',
      callerNumber: '+15550003333',
      receiverNumber: '+15550004444',
    });

    const storedCalls = await callRepository.find();

    expect(secondCall.id).toBe(firstCall.id);
    expect(storedCalls).toHaveLength(1);
    expect(storedCalls[0].status).toBe(CallStatus.STARTED);
    expect(storedCalls[0].callerNumber).toBe('+15550001111');
  });

  it('records completed status, duration, and ended time', async () => {
    await service.createFromTwilio({
      twilioCallSid: 'CA-int-2',
    });

    await service.markCompleted('CA-int-2', 35);

    const storedCall = await callRepository.findOneOrFail({
      where: { twilioCallSid: 'CA-int-2' },
    });

    expect(storedCall.status).toBe(CallStatus.COMPLETED);
    expect(storedCall.duration).toBe(35);
    expect(storedCall.endedAt).toBeInstanceOf(Date);
  });
});
