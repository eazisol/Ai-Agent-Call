import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import type { RequestWithCorrelationId } from '../types/request-with-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithCorrelationId>();
    const response = context.switchToHttp().getResponse<Response>();
    const suppliedId = request.header('x-correlation-id');
    const correlationId = suppliedId?.slice(0, 128) || randomUUID();

    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    return next.handle();
  }
}
