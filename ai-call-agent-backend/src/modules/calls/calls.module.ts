import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { Call } from './entities/call.entity';
import { CallMessage } from './entities/call-message.entity';
import { CallRecording } from './entities/call-recording.entity';
import { EmailLog } from './entities/email-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Call,
      CallMessage,
      CallRecording,
      EmailLog,
    ]),
  ],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService, TypeOrmModule],
})
export class CallsModule { }