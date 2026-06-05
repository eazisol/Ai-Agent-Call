import { Test, TestingModule } from '@nestjs/testing';
import { N8nService } from './n8n.service';

describe('N8nService', () => {
  let service: N8nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [N8nService],
    }).compile();

    service = module.get<N8nService>(N8nService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
