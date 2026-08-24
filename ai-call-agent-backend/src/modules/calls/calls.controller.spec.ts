import { Test, TestingModule } from '@nestjs/testing';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';

describe('CallsController', () => {
  let controller: CallsController;
  const callsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallsController],
      providers: [
        {
          provide: CallsService,
          useValue: callsService,
        },
      ],
    }).compile();

    controller = module.get<CallsController>(CallsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns all calls from the service', async () => {
    const calls = [{ id: '1' }];
    callsService.findAll.mockResolvedValue(calls);

    await expect(controller.findAll()).resolves.toBe(calls);
    expect(callsService.findAll).toHaveBeenCalledTimes(1);
  });

  it('returns one call by id from the service', async () => {
    const call = { id: 'call-1' };
    callsService.findOne.mockResolvedValue(call);

    await expect(controller.findOne('call-1')).resolves.toBe(call);
    expect(callsService.findOne).toHaveBeenCalledWith('call-1');
  });
});
