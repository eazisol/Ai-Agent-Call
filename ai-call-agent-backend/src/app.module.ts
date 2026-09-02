import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { ObjectStorageModule } from './infrastructure/object-storage/object-storage.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { CallsModule } from './modules/calls/calls.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { VoicesModule } from './modules/voices/voices.module';
import { N8nModule } from './modules/n8n/n8n.module';
import { OpenaiRealtimeModule } from './modules/openai-realtime/openai-realtime.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PhoneNumbersModule } from './modules/phone-numbers/phone-numbers.module';
import { TwilioModule } from './modules/twilio/twilio.module';
import { VoiceStreamModule } from './modules/voice-stream/voice-stream.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('database.host'),
        port: config.get<number>('database.port') ?? 5432,
        username: config.getOrThrow<string>('database.user'),
        password: config.getOrThrow<string>('database.password'),
        database: config.getOrThrow<string>('database.name'),
        ssl: config.get<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
        autoLoadEntities: true,
        synchronize: false,
        migrationsTableName: 'eazi_ai_call_migrations',
        logging: false,
        extra: {
          max: config.get<number>('database.poolMax') ?? 5,
          idleTimeoutMillis:
            config.get<number>('database.poolIdleTimeoutMs') ?? 30_000,
          connectionTimeoutMillis:
            config.get<number>('database.poolConnectionTimeoutMs') ?? 5_000,
        },
      }),
    }),
    AuthModule,
    OrganizationsModule,
    BusinessesModule,
    AgentsModule,
    KnowledgeModule,
    VoicesModule,
    CallsModule,
    OpenaiRealtimeModule,
    VoiceStreamModule,
    TwilioModule,
    PhoneNumbersModule,
    N8nModule,
    RedisModule,
    ObjectStorageModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
