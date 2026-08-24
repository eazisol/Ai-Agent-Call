import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ObjectStorageHealthService } from '../infrastructure/object-storage/object-storage-health.service';
import { RedisHealthService } from '../infrastructure/redis/redis-health.service';

export interface HealthResult {
  status: 'ok' | 'error';
  service: 'EaziAiCall';
  checks?: Record<string, 'up' | 'down' | 'disabled'>;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisHealthService,
    private readonly objectStorage: ObjectStorageHealthService,
  ) {}

  live(): HealthResult {
    return { status: 'ok', service: 'EaziAiCall' };
  }

  async ready(): Promise<HealthResult> {
    const checks: HealthResult['checks'] = {};
    let healthy = true;

    healthy =
      (await this.runCheck('database', checks, async () => {
        await this.dataSource.query('SELECT 1');
      })) && healthy;
    healthy =
      (await this.runCheck('redis', checks, () => this.redis.ping())) &&
      healthy;
    healthy =
      (await this.runCheck('objectStorage', checks, () =>
        this.objectStorage.healthCheck(),
      )) && healthy;

    return { status: healthy ? 'ok' : 'error', service: 'EaziAiCall', checks };
  }

  private async runCheck(
    name: string,
    checks: Record<string, 'up' | 'down' | 'disabled'>,
    check: () => Promise<void>,
  ): Promise<boolean> {
    try {
      await check();
      checks[name] = 'up';
      return true;
    } catch {
      checks[name] = 'down';
      return false;
    }
  }
}
