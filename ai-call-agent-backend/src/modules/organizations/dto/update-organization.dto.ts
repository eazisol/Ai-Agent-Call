import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string | null;
}
