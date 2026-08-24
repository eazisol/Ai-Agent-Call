import { Module } from '@nestjs/common';
import { VoiceStreamGateway } from './voice-stream.gateway';
import { VoiceStreamService } from './voice-stream.service';
import { OpenaiRealtimeModule } from '../openai-realtime/openai-realtime.module';
import { VoiceStreamTokenService } from './voice-stream-token.service';

@Module({
  imports: [OpenaiRealtimeModule],
  providers: [VoiceStreamGateway, VoiceStreamService, VoiceStreamTokenService],
  exports: [VoiceStreamService, VoiceStreamTokenService],
})
export class VoiceStreamModule {}
