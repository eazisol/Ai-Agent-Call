import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from '../../common/errors/application-error';

type Bucket = {
  count: number;
  resetAt: number;
};

/**
 * Fixed-window in-memory limiter for auth endpoints.
 * Sufficient for single-instance MVP; replace with Redis-backed limiter later if needed.
 */
@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly config: ConfigService) {}

  consume(bucketKey: string): void {
    const limit = this.config.get<number>('auth.rateLimitMax') ?? 20;
    const windowMs =
      this.config.get<number>('auth.rateLimitWindowMs') ?? 900_000;
    const now = Date.now();
    const existing = this.buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (existing.count >= limit) {
      throw new ApplicationError(
        'RATE_LIMITED',
        'Too many authentication attempts. Please try again later.',
        429,
      );
    }

    existing.count += 1;
    this.buckets.set(bucketKey, existing);
  }

  /** Test helper — clears all buckets. */
  reset(): void {
    this.buckets.clear();
  }
}
