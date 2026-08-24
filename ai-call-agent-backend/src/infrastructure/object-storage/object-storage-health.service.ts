import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ObjectStoragePort } from './object-storage.port';

@Injectable()
export class ObjectStorageHealthService implements ObjectStoragePort {
  constructor(private readonly config: ConfigService) {}

  async healthCheck(): Promise<void> {
    if (!(this.config.get<boolean>('objectStorage.enabled') ?? false)) {
      return;
    }

    const endpoint = this.config.get<string>('objectStorage.endpoint');
    if (!endpoint) {
      throw new Error('Object storage endpoint is not configured');
    }

    const timeout =
      this.config.get<number>('objectStorage.healthTimeoutMs') ?? 2000;
    const response = await fetch(endpoint, {
      method: 'HEAD',
      signal: AbortSignal.timeout(timeout),
    });

    if (response.status >= 500) {
      throw new Error(
        `Object storage health check returned ${response.status}`,
      );
    }
  }
}
