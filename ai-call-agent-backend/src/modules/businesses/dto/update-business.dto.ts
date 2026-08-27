import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  BUSINESS_INDUSTRIES,
  BUSINESS_LANGUAGES,
  BUSINESS_STATUSES,
} from '../entities/business.entity';
import {
  BusinessHourDto,
  BusinessSettingsDto,
} from './create-business.dto';

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsIn([...BUSINESS_INDUSTRIES])
  industry?: (typeof BUSINESS_INDUSTRIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industryLabel?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(255)
  website?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @IsIn([...BUSINESS_LANGUAGES])
  defaultLanguage?: (typeof BUSINESS_LANGUAGES)[number];

  @IsOptional()
  @IsIn([...BUSINESS_STATUSES])
  status?: (typeof BUSINESS_STATUSES)[number];

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessSettingsDto)
  settings?: BusinessSettingsDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => BusinessHourDto)
  hours?: BusinessHourDto[];
}
