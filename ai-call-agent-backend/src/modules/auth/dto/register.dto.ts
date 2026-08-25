import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;

  /** Internal relative return path only (open-redirect safe). */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Matches(/^\/(?!\/).*$/)
  returnTo?: string;
}
