import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Agent } from '../agents/entities/agent.entity';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TwilioModule } from '../twilio/twilio.module';
import { PhoneNumberAssignment } from './entities/phone-number-assignment.entity';
import { PhoneNumber } from './entities/phone-number.entity';
import { PhoneNumbersController } from './phone-numbers.controller';
import { PhoneNumbersService } from './phone-numbers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PhoneNumber,
      PhoneNumberAssignment,
      Agent,
      Business,
    ]),
    AuthModule,
    OrganizationsModule,
    TwilioModule,
  ],
  controllers: [PhoneNumbersController],
  providers: [PhoneNumbersService],
  exports: [PhoneNumbersService, TypeOrmModule],
})
export class PhoneNumbersModule {}
