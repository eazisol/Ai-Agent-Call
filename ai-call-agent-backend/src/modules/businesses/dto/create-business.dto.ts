import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  BUSINESS_INDUSTRIES,
  BUSINESS_LANGUAGES,
} from '../entities/business.entity';

const TIME_HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class BusinessSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string | null;
}

export class BusinessHourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsBoolean()
  isClosed!: boolean;

  @ValidateIf((hour: BusinessHourDto) => !hour.isClosed)
  @IsString()
  @Matches(TIME_HH_MM, {
    message: 'opensAt must be HH:mm (24-hour)',
  })
  opensAt?: string | null;

  @ValidateIf((hour: BusinessHourDto) => !hour.isClosed)
  @IsString()
  @Matches(TIME_HH_MM, {
    message: 'closesAt must be HH:mm (24-hour)',
  })
  closesAt?: string | null;
}

export class CreateBusinessDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsIn([...BUSINESS_INDUSTRIES])
  industry!: (typeof BUSINESS_INDUSTRIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industryLabel?: string | null;

  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(255)
  website?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  timezone!: string;

  @IsIn([...BUSINESS_LANGUAGES])
  defaultLanguage!: (typeof BUSINESS_LANGUAGES)[number];

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
