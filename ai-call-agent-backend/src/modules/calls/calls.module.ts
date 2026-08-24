import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { Call } from './entities/call.entity';
import { CallMessage } from './entities/call-message.entity';
import { CallRecording } from './entities/call-recording.entity';
import { EmailLog } from './entities/email-log.entity';
import { CallProviderMapping } from './entities/call-provider-mapping.entity';
import { ProviderEvent } from './entities/provider-event.entity';
import { PrototypeOnlyGuard } from '../../common/guards/prototype-only.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Call,
      CallMessage,
      CallRecording,
      EmailLog,
      CallProviderMapping,
      ProviderEvent,
    ]),
  ],
  controllers: [CallsController],
  providers: [CallsService, PrototypeOnlyGuard],
  exports: [CallsService, TypeOrmModule],
})
export class CallsModule {}
