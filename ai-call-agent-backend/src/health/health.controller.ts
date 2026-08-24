import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService, type HealthResult } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  live(): HealthResult {
    return this.health.live();
  }

  @Get('ready')
  async ready(): Promise<HealthResult> {
    const result = await this.health.ready();
    if (result.status === 'error') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
