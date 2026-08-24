import { HttpStatus } from '@nestjs/common';

export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = ApplicationError.name;
  }
}
