import { IsIn, IsString } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsString()
  @IsIn(['admin', 'manager', 'viewer'])
  role!: 'admin' | 'manager' | 'viewer';
}
