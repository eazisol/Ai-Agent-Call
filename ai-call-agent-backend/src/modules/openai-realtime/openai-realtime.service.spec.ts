import { Test, TestingModule } from '@nestjs/testing';
import { OpenaiRealtimeService } from './openai-realtime.service';

describe('OpenaiRealtimeService', () => {
  let service: OpenaiRealtimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenaiRealtimeService],
    }).compile();

    service = module.get<OpenaiRealtimeService>(OpenaiRealtimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
