import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Agent } from '../agents/entities/agent.entity';
import { Business } from '../businesses/entities/business.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PhoneNumber } from '../phone-numbers/entities/phone-number.entity';
import { EntitlementsService } from './entitlements.service';
import { PlanEntitlement } from './entities/plan-entitlement.entity';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { PlansService } from './plans.service';
import {
  PublicPlansController,
  SubscriptionsController,
} from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      PlanEntitlement,
      Subscription,
      Business,
      Agent,
      PhoneNumber,
    ]),
    AuthModule,
    OrganizationsModule,
  ],
  controllers: [PublicPlansController, SubscriptionsController],
  providers: [PlansService, SubscriptionsService, EntitlementsService],
  exports: [
    PlansService,
    SubscriptionsService,
    EntitlementsService,
    TypeOrmModule,
  ],
})
export class SubscriptionsModule {}
