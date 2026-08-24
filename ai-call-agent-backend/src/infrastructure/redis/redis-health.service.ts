import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';

@Injectable()
export class RedisHealthService {
  constructor(private readonly config: ConfigService) {}

  async ping(): Promise<void> {
    if (!(this.config.get<boolean>('redis.enabled') ?? false)) {
      return;
    }

    const host = this.config.get<string>('redis.host') ?? 'localhost';
    const port = this.config.get<number>('redis.port') ?? 6379;
    const timeout = this.config.get<number>('redis.connectTimeoutMs') ?? 1500;
    const password = this.config.get<string>('redis.password');

    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({ host, port });
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('Redis health check timed out'));
      }, timeout);

      const finish = (error?: Error) => {
        clearTimeout(timer);
        socket.destroy();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      socket.once('error', finish);
      socket.once('connect', () => {
        const command = password
          ? `*2\r\n$4\r\nAUTH\r\n$${Buffer.byteLength(password)}\r\n${password}\r\n*1\r\n$4\r\nPING\r\n`
          : '*1\r\n$4\r\nPING\r\n';
        socket.write(command);
      });
      socket.once('data', (data) => {
        const response = data.toString('utf8');
        if (response.includes('+PONG')) {
          finish();
        } else {
          finish(new Error('Redis health check failed'));
        }
      });
    });
  }
}
