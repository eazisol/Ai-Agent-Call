import { CallStatus } from '../entities/call.entity';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListCallsQueryDto {
  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;

  @IsOptional()
  direction?: 'inbound' | 'outbound';

  @IsOptional()
  @IsUUID('4')
  agentId?: string;

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
