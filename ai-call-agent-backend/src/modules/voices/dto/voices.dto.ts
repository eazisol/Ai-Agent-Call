import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  VOICE_ASSET_SOURCE_TYPES,
  VOICE_GENDER_PRESENTATIONS,
} from '../entities/voice-asset.entity';

export class AssignAgentVoiceDto {
  @IsUUID('4')
  voiceId!: string;
}

export class PreviewVoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sampleText?: string;
}

export class ListVoicesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @IsOptional()
  @IsIn([...VOICE_GENDER_PRESENTATIONS])
  genderPresentation?: (typeof VOICE_GENDER_PRESENTATIONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accent?: string;

  @IsOptional()
  @IsIn([...VOICE_ASSET_SOURCE_TYPES])
  sourceType?: (typeof VOICE_ASSET_SOURCE_TYPES)[number];

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
