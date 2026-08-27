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
import { AGENT_LANGUAGES } from '../entities/agent.entity';

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

  @IsIn([...AGENT_LANGUAGES])
  language!: (typeof AGENT_LANGUAGES)[number];

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
