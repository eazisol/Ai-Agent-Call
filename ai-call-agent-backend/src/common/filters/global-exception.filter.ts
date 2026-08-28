import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationError } from '../errors/application-error';
import type { RequestWithCorrelationId } from '../types/request-with-correlation-id';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: Record<string, unknown>;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithCorrelationId>();
    const response = http.getResponse<Response>();
    const correlationId = request.correlationId ?? 'unknown';

    const error = this.normalize(exception, correlationId);
    const logContext = `${request.method} ${request.originalUrl} correlationId=${correlationId}`;

    if (error.statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${logContext}: ${error.body.error.message}`, stack);
    } else {
      this.logger.warn(`${logContext}: ${error.body.error.message}`);
    }

    response.status(error.statusCode).json(error.body);
  }

  private normalize(
    exception: unknown,
    correlationId: string,
  ): { statusCode: number; body: ErrorResponse } {
    if (exception instanceof ApplicationError) {
      return {
        statusCode: exception.statusCode,
        body: {
          error: {
            code: exception.code,
            message: exception.message,
            correlationId,
            details: exception.details,
          },
        },
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : (this.messageFromPayload(payload) ?? exception.message);
      const details = this.detailsFromPayload(payload);

      return {
        statusCode,
        body: {
          error: {
            code:
              statusCode === 400 ? 'VALIDATION_ERROR' : `HTTP_${statusCode}`,
            message,
            correlationId,
            details,
          },
        },
      };
    }

    if (
      exception instanceof Error &&
      exception.name === 'PayloadTooLargeError'
    ) {
      return {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        body: {
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'The uploaded file is too large.',
            correlationId,
          },
        },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
          correlationId,
        },
      },
    };
  }

  private messageFromPayload(payload: object): string | undefined {
    const message = (payload as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join(', ') : message;
  }

  private detailsFromPayload(
    payload: unknown,
  ): Record<string, unknown> | undefined {
    if (typeof payload !== 'object' || payload === null) {
      return undefined;
    }
    const message = (payload as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return { validation: message };
    }
    return undefined;
  }
}
