import { Module } from '@nestjs/common';
import { EMAIL_DELIVERY_PORT } from '../../providers/email-delivery.port';
import { SmtpEmailAdapter } from './smtp-email.adapter';

@Module({
  providers: [
    SmtpEmailAdapter,
    { provide: EMAIL_DELIVERY_PORT, useExisting: SmtpEmailAdapter },
  ],
  exports: [EMAIL_DELIVERY_PORT, SmtpEmailAdapter],
})
export class EmailModule {}
