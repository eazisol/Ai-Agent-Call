import { Test, TestingModule } from '@nestjs/testing';
import { VoiceStreamService } from './voice-stream.service';

describe('VoiceStreamService', () => {
  let service: VoiceStreamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoiceStreamService],
    }).compile();

    service = module.get<VoiceStreamService>(VoiceStreamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
