import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TelephonyProviderMapping,
  type TelephonyMappingStatus,
} from './entities/telephony-provider-mapping.entity';

@Injectable()
export class TelephonyMappingsService {
  constructor(
    @InjectRepository(TelephonyProviderMapping)
    private readonly mappings: Repository<TelephonyProviderMapping>,
  ) {}

  async recordActiveMapping(input: {
    provider: string;
    externalResourceId: string;
    phoneNumber?: string;
    metadata?: Record<string, unknown>;
  }): Promise<TelephonyProviderMapping> {
    const existing = await this.mappings.findOne({
      where: {
        provider: input.provider,
        externalResourceId: input.externalResourceId,
      },
    });

    if (existing) {
      existing.phoneNumber = input.phoneNumber ?? existing.phoneNumber;
      existing.status = 'active';
      existing.metadata = {
        ...(existing.metadata ?? {}),
        ...(input.metadata ?? {}),
      };
      return this.mappings.save(existing);
    }

    return this.mappings.save(
      this.mappings.create({
        provider: input.provider,
        resourceType: 'phone_number',
        externalResourceId: input.externalResourceId,
        phoneNumber: input.phoneNumber ?? null,
        status: 'active',
        metadata: input.metadata ?? {},
      }),
    );
  }

  async markReleased(
    provider: string,
    externalResourceId: string,
  ): Promise<void> {
    await this.mappings.update(
      { provider, externalResourceId },
      { status: 'released' satisfies TelephonyMappingStatus },
    );
  }

  async countActive(provider: string): Promise<number> {
    return this.mappings.count({
      where: { provider, status: 'active' },
    });
  }
}
