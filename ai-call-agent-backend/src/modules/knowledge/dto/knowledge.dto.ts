import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateKnowledgeUrlDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string | null;
}

export class CreateKnowledgeTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string | null;
}

export class KnowledgeFaqItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  question!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  answer!: string;
}

export class CreateKnowledgeFaqDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => KnowledgeFaqItemDto)
  items!: KnowledgeFaqItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string | null;
}

export class UpdateKnowledgeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  text?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => KnowledgeFaqItemDto)
  items?: KnowledgeFaqItemDto[];
}
