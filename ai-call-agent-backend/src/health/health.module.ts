import { Module } from '@nestjs/common';
import { ObjectStorageModule } from '../infrastructure/object-storage/object-storage.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { TwilioModule } from '../modules/twilio/twilio.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [RedisModule, ObjectStorageModule, TwilioModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
