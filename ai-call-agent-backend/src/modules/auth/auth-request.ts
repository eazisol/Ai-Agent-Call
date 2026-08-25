import type { Request } from 'express';
import type { AuthUserView } from './auth.service';
import type { RequestWithCorrelationId } from '../../common/types/request-with-correlation-id';

export interface AuthenticatedRequest extends RequestWithCorrelationId {
  authUser?: AuthUserView;
  cookies: Record<string, string | undefined>;
}

export function readCookie(
  request: Request,
  name: string,
): string | undefined {
  const cookies = (request as AuthenticatedRequest).cookies;
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
