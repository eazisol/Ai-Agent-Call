import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ElevenLabsConversationWebhookDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  conversation_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  conversationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  call_sid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  callSid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  event_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  agent_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  agentId?: string;
}
