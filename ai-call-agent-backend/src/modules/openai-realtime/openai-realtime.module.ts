import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenaiRealtimeService } from './openai-realtime.service';
import { AiConfig } from './entities/ai-config.entity';
import { VOICE_AGENT_PROVIDER_PORT } from '../../providers/voice-agent-provider.port';

@Module({
  imports: [TypeOrmModule.forFeature([AiConfig])],
  providers: [
    OpenaiRealtimeService,
    { provide: VOICE_AGENT_PROVIDER_PORT, useExisting: OpenaiRealtimeService },
  ],
  exports: [OpenaiRealtimeService, VOICE_AGENT_PROVIDER_PORT, TypeOrmModule],
})
export class OpenaiRealtimeModule {}
