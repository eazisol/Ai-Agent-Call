import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../../infrastructure/email/email.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { OrganizationInvitation } from './entities/organization-invitation.entity';
import { OrganizationMember } from './entities/organization-member.entity';
import { Organization } from './entities/organization.entity';
import {
  InvitationsController,
  OrganizationsController,
} from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { TeamService } from './team.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      OrganizationInvitation,
      User,
    ]),
    AuthModule,
    EmailModule,
  ],
  controllers: [OrganizationsController, InvitationsController],
  providers: [OrganizationsService, TeamService],
  exports: [OrganizationsService, TeamService, TypeOrmModule],
})
export class OrganizationsModule {}
