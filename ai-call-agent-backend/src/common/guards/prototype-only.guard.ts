import { CanActivate, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from '../errors/application-error';

@Injectable()
export class PrototypeOnlyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const enabled =
      this.config.get<boolean>('app.prototypeApiEnabled') ?? false;
    const environment = this.config.get<string>('app.nodeEnv');

    if (!enabled || environment === 'production') {
      throw new ApplicationError(
        'PROTOTYPE_API_DISABLED',
        'This prototype endpoint is disabled.',
        404,
      );
    }

    return true;
  }
}
