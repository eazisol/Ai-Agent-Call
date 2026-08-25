import { DataSource } from 'typeorm';
import { EmailVerificationToken } from '../modules/auth/entities/email-verification-token.entity';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { User } from '../modules/auth/entities/user.entity';
import { Business } from '../modules/businesses/entities/business.entity';
import { CallMessage } from '../modules/calls/entities/call-message.entity';
import { CallProviderMapping } from '../modules/calls/entities/call-provider-mapping.entity';
import { CallRecording } from '../modules/calls/entities/call-recording.entity';
import { Call } from '../modules/calls/entities/call.entity';
import { EmailLog } from '../modules/calls/entities/email-log.entity';
import { ProviderEvent } from '../modules/calls/entities/provider-event.entity';
import { OrganizationMember } from '../modules/organizations/entities/organization-member.entity';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { AiConfig } from '../modules/openai-realtime/entities/ai-config.entity';
import { FoundationBaseline1724500000000 } from './migrations/1724500000000-FoundationBaseline';
import { AuthIdentity1756040000000 } from './migrations/1756040000000-AuthIdentity';
import { UsersEmailCaseInsensitive1756041000000 } from './migrations/1756041000000-UsersEmailCaseInsensitive';
import { Organizations1756050000000 } from './migrations/1756050000000-Organizations';
import { loadBackendEnv } from './load-backend-env';

loadBackendEnv();

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
    User,
    RefreshToken,
    EmailVerificationToken,
    PasswordResetToken,
    Organization,
    OrganizationMember,
    Business,
    Call,
    CallMessage,
    CallRecording,
    EmailLog,
    CallProviderMapping,
    ProviderEvent,
    AiConfig,
  ],
  migrations: [
    FoundationBaseline1724500000000,
    AuthIdentity1756040000000,
    UsersEmailCaseInsensitive1756041000000,
    Organizations1756050000000,
  ],
  migrationsTableName: 'eazi_ai_call_migrations',
  synchronize: false,
});
