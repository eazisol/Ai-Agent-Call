import { IsUUID } from 'class-validator';

export class SetActiveBusinessDto {
  @IsUUID()
  businessId!: string;
}
