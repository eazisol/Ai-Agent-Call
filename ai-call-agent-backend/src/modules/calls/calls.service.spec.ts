import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { CallsService } from './calls.service';
import { Call, CallStatus } from './entities/call.entity';
import {
  createRepositoryMock,
  MockRepository,
} from '../../../test/helpers/repository.mock';

describe('CallsService', () => {
  let service: CallsService;
  let callRepository: MockRepository<Call>;

  beforeEach(async () => {
    callRepository = createRepositoryMock<Call>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallsService,
        {
          provide: getRepositoryToken(Call),
          useValue: callRepository,
        },
      ],
    }).compile();

    service = module.get<CallsService>(CallsService);
  });

  it('creates a new started call for a new Twilio Call SID', async () => {
    const createdCall = {
      twilioCallSid: 'CA-100',
      callerNumber: '+15550001111',
      receiverNumber: '+15550002222',
      status: CallStatus.STARTED,
      startedAt: new Date(),
    } as Call;

    const savedCall: Call = {
      id: 'call-1',
      ...createdCall,
    };

    (callRepository.findOne as jest.Mock).mockResolvedValue(null);
    (callRepository.create as jest.Mock).mockReturnValue(createdCall);
    (callRepository.save as jest.Mock).mockResolvedValue(savedCall);

    const result: Call = await service.createFromTwilio({
      twilioCallSid: 'CA-100',
      callerNumber: '+15550001111',
      receiverNumber: '+15550002222',
    });

    expect(callRepository.findOne).toHaveBeenCalledWith({
      where: { twilioCallSid: 'CA-100' },
    });
    const createCalls = (callRepository.create as jest.Mock).mock.calls as [
      [Call],
    ];
    const createCallArguments = createCalls[0]?.[0];

    expect(createCallArguments.twilioCallSid).toBe('CA-100');
    expect(createCallArguments.callerNumber).toBe('+15550001111');
    expect(createCallArguments.receiverNumber).toBe('+15550002222');
    expect(createCallArguments.status).toBe(CallStatus.STARTED);
    expect(createCallArguments.startedAt).toBeInstanceOf(Date);
    expect(callRepository.save).toHaveBeenCalledWith(createdCall);
    expect(result).toBe(savedCall);
  });

  it('returns the existing call for a duplicate Twilio Call SID', async () => {
    const existingCall = {
      id: 'call-2',
      twilioCallSid: 'CA-200',
      status: CallStatus.STARTED,
    } as Call;

    (callRepository.findOne as jest.Mock).mockResolvedValue(existingCall);

    const result = await service.createFromTwilio({
      twilioCallSid: 'CA-200',
    });

    expect(result).toBe(existingCall);
    expect(callRepository.create).not.toHaveBeenCalled();
    expect(callRepository.save).not.toHaveBeenCalled();
  });

  it('marks a call completed with duration and ended time', async () => {
    await service.markCompleted('CA-300', 42);

    const updateCalls = (callRepository.update as jest.Mock).mock.calls as [
      [{ twilioCallSid: string }, Partial<Call>],
    ];
    const updatePatch = updateCalls[0]?.[1];

    expect(callRepository.update).toHaveBeenCalledWith(
      { twilioCallSid: 'CA-300' },
      expect.anything(),
    );
    expect(updatePatch?.status).toBe(CallStatus.COMPLETED);
    expect(updatePatch?.duration).toBe(42);
    expect(updatePatch?.endedAt).toBeInstanceOf(Date);
  });

  it('loads all calls newest first', async () => {
    const calls: Call[] = [{ id: 'a' } as Call, { id: 'b' } as Call];
    (callRepository.find as jest.Mock).mockResolvedValue(calls);

    const result: Call[] = await service.findAll();

    expect(callRepository.find).toHaveBeenCalledWith({
      order: {
        createdAt: 'DESC',
      },
    });
    expect(result).toBe(calls);
  });

  it('loads one call by id', async () => {
    const call = { id: 'call-4' } as Call;
    (callRepository.findOne as jest.Mock).mockResolvedValue(call);

    const result: Call | null = await service.findOne('call-4');

    expect(callRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'call-4' },
    });
    expect(result).toBe(call);
  });
});
