import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServiceInfo() {
    return {
      name: 'EaziAiCall',
      status: 'ok',
      apiVersion: 'v1',
    };
  }
}
