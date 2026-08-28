import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VOICE_CLONE_STATUSES } from '../entities/voice-clone.entity';
import { VOICE_CLONE_CONSENT_VERSION } from '../../../providers/voice-clone.port';

export class CreateVoiceCloneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class ListVoiceClonesQueryDto {
  @IsOptional()
  @IsIn(VOICE_CLONE_STATUSES)
  status?: (typeof VOICE_CLONE_STATUSES)[number];

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

export class RecordVoiceCloneConsentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  consentVersion!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  @MaxLength(128)
  consentTextHash!: string;
}

export const ALLOWED_VOICE_CLONE_CONSENT_VERSIONS = [
  VOICE_CLONE_CONSENT_VERSION,
] as const;
