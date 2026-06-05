import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { CallsModule } from './modules/calls/calls.module';
import { OpenaiRealtimeModule } from './modules/openai-realtime/openai-realtime.module';
import { TwilioModule } from './modules/twilio/twilio.module';
import { VoiceStreamModule } from './modules/voice-stream/voice-stream.module';
import { N8nModule } from './modules/n8n/n8n.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: true, // only for development
        logging: config.get<string>('app.nodeEnv') === 'development',
      }),
    }),

    BusinessesModule,

    CallsModule,

    OpenaiRealtimeModule,

    TwilioModule,

    VoiceStreamModule,

    N8nModule,
  ],
})
export class AppModule { }