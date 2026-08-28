import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PHONE_NUMBER_STATUSES } from '../entities/phone-number.entity';

export class ListPhoneNumbersQueryDto {
  @IsOptional()
  @IsIn([...PHONE_NUMBER_STATUSES])
  status?: (typeof PHONE_NUMBER_STATUSES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SearchPhoneNumbersDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  @Matches(/^[A-Za-z]{2}$/)
  isoCountry!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  areaCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contains?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class PurchasePhoneNumberDto {
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'phoneNumber must be a valid E.164 value.',
  })
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  friendlyName?: string;

  @IsBoolean()
  confirm!: boolean;
}

export class ImportPhoneNumberDto {
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'phoneNumber must be a valid E.164 value.',
  })
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  friendlyName?: string;
}

export class AssignPhoneNumberDto {
  @IsUUID()
  agentId!: string;
}

export class ReleasePhoneNumberDto {
  @IsBoolean()
  confirm!: boolean;

  @IsOptional()
  @IsBoolean()
  unassignFirst?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  releaseReason?: string;
}
