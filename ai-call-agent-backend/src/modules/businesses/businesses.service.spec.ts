import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Call } from '../calls/entities/call.entity';
import { AiConfig } from '../openai-realtime/entities/ai-config.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { BusinessesService } from './businesses.service';
import { BusinessHour } from './entities/business-hour.entity';
import { BusinessSettings } from './entities/business-settings.entity';
import { Business } from './entities/business.entity';

describe('BusinessesService', () => {
  let service: BusinessesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        { provide: DataSource, useValue: {} },
        { provide: OrganizationsService, useValue: {} },
        { provide: getRepositoryToken(Business), useValue: {} },
        { provide: getRepositoryToken(BusinessSettings), useValue: {} },
        { provide: getRepositoryToken(BusinessHour), useValue: {} },
        { provide: getRepositoryToken(Call), useValue: {} },
        { provide: getRepositoryToken(AiConfig), useValue: {} },
      ],
    }).compile();

    service = module.get<BusinessesService>(BusinessesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
