import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenaiRealtimeService } from './openai-realtime.service';
import { AiConfig } from './entities/ai-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiConfig])],
  providers: [OpenaiRealtimeService],
  exports: [OpenaiRealtimeService, TypeOrmModule],
})
export class OpenaiRealtimeModule { }