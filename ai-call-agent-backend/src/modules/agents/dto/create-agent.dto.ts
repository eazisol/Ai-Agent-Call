import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsCatalogueLanguageCode } from '../../../common/i18n/is-catalogue-language.decorator';
import {
  AGENT_LANGUAGE_MODES,
  AGENT_VOICE_PREFERENCES,
} from '../entities/agent.entity';

const PHONE_PATTERN = /^\+?[0-9()\-\s.]{7,30}$/;

export class CreateAgentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  roleLabel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  personality?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  greeting!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  instructions!: string;

  /** When true (default), inherit language settings from the business. */
  @IsOptional()
  @IsBoolean()
  useBusinessLanguageSettings?: boolean;

  @IsOptional()
  @IsIn([...AGENT_LANGUAGE_MODES])
  languageMode?: (typeof AGENT_LANGUAGE_MODES)[number];

  @IsOptional()
  @IsString()
  @IsCatalogueLanguageCode()
  language?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsCatalogueLanguageCode({ each: true })
  languages?: string[];

  @IsOptional()
  @IsBoolean()
  languageDetectionEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  languageSwitchingEnabled?: boolean;

  @IsOptional()
  @IsIn([...AGENT_VOICE_PREFERENCES])
  voicePreference?: (typeof AGENT_VOICE_PREFERENCES)[number];

  @IsOptional()
  @IsBoolean()
  escalationEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  escalationKeywords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(PHONE_PATTERN, {
    message: 'escalationContactPhone format is invalid.',
  })
  escalationContactPhone?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  escalationContactEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  escalationMessage?: string | null;
}
