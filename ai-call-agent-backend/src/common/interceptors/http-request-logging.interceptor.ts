import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { RequestWithCorrelationId } from '../types/request-with-correlation-id';

@Injectable()
export class HttpRequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP_REQUEST');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithCorrelationId>();
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode?: number }>();
    const started = Date.now();
    const method = request.method;
    const path = request.originalUrl ?? request.url;
    const correlationId = request.correlationId ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(
            method,
            path,
            response.statusCode ?? 200,
            started,
            correlationId,
          );
        },
        error: () => {
          this.logRequest(
            method,
            path,
            response.statusCode ?? 500,
            started,
            correlationId,
          );
        },
      }),
    );
  }

  private logRequest(
    method: string,
    path: string,
    status: number,
    started: number,
    correlationId: string,
  ): void {
    const durationMs = Date.now() - started;
    this.logger.log(
      `HTTP_REQUEST method=${method} path=${path} status=${status} durationMs=${durationMs} correlationId=${correlationId}`,
    );
  }
}
