import { Allow, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Accepts both flat legacy payloads and the official post-call envelope:
 * { type, event_timestamp, data: { conversation_id, agent_id, metadata, ... } }
 * Nested `data` is Allow()'d so ValidationPipe whitelist does not strip it.
 */
export class ElevenLabsConversationWebhookDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @IsOptional()
  @Allow()
  event_timestamp?: number | string;

  @IsOptional()
  @IsObject()
  @Allow()
  data?: Record<string, unknown>;

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
