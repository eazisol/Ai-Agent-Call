import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TwilioWebhookDto {
  @IsString()
  @IsNotEmpty()
  CallSid!: string;

  @IsOptional()
  @IsString()
  From?: string;

  @IsOptional()
  @IsString()
  To?: string;

  @IsOptional()
  @IsString()
  CallStatus?: string;

  @IsOptional()
  @IsString()
  CallDuration?: string;

  @IsOptional()
  @IsString()
  Timestamp?: string;

  @IsOptional()
  @IsString()
  SequenceNumber?: string;
}
