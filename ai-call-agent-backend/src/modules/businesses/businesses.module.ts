import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Call } from '../calls/entities/call.entity';
import { AiConfig } from '../openai-realtime/entities/ai-config.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BusinessHour } from './entities/business-hour.entity';
import { BusinessSettings } from './entities/business-settings.entity';
import { Business } from './entities/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      BusinessSettings,
      BusinessHour,
      Call,
      AiConfig,
    ]),
    AuthModule,
    OrganizationsModule,
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService],
  exports: [BusinessesService, TypeOrmModule],
})
export class BusinessesModule {}
