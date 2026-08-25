import { IsEmail, IsIn, IsString, MaxLength } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @IsIn(['admin', 'manager', 'viewer'])
  role!: 'admin' | 'manager' | 'viewer';
}
