import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ApplicationError } from '../../common/errors/application-error';

@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService) {}

  async hash(plainPassword: string): Promise<string> {
    this.assertPasswordPolicy(plainPassword);
    const rounds = this.config.get<number>('auth.bcryptRounds') ?? 12;
    return bcrypt.hash(plainPassword, rounds);
  }

  async verify(
    plainPassword: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  assertPasswordPolicy(plainPassword: string): void {
    if (plainPassword.length < 8 || plainPassword.length > 128) {
      throw new ApplicationError(
        'INVALID_PASSWORD',
        'Password must be between 8 and 128 characters.',
      );
    }
  }
}
