import { Module } from '@nestjs/common';
import { VoiceStreamGateway } from './voice-stream.gateway';
import { VoiceStreamService } from './voice-stream.service';
import { OpenaiRealtimeModule } from '../openai-realtime/openai-realtime.module';

@Module({
  imports: [OpenaiRealtimeModule],
  providers: [VoiceStreamGateway, VoiceStreamService],
  exports: [VoiceStreamService],
})
export class VoiceStreamModule { }