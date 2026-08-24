import { DataSource } from 'typeorm';
import { Business } from '../modules/businesses/entities/business.entity';
import { CallMessage } from '../modules/calls/entities/call-message.entity';
import { CallProviderMapping } from '../modules/calls/entities/call-provider-mapping.entity';
import { CallRecording } from '../modules/calls/entities/call-recording.entity';
import { Call } from '../modules/calls/entities/call.entity';
import { EmailLog } from '../modules/calls/entities/email-log.entity';
import { ProviderEvent } from '../modules/calls/entities/provider-event.entity';
import { AiConfig } from '../modules/openai-realtime/entities/ai-config.entity';
import { FoundationBaseline1724500000000 } from './migrations/1724500000000-FoundationBaseline';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME ?? 'ai_call_agent',
  ssl:
    process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [
    Business,
    Call,
    CallMessage,
    CallRecording,
    EmailLog,
    CallProviderMapping,
    ProviderEvent,
    AiConfig,
  ],
  migrations: [FoundationBaseline1724500000000],
  synchronize: false,
});
