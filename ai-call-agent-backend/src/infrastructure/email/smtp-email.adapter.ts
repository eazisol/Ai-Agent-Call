import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { ApplicationError } from '../../common/errors/application-error';
import type {
  EmailDeliveryPort,
  EmailMessage,
} from '../../providers/email-delivery.port';

@Injectable()
export class SmtpEmailAdapter implements EmailDeliveryPort {
  readonly providerName = 'smtp';
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async send(message: EmailMessage): Promise<void> {
    const transporter = this.getTransporter();
    const from = this.config.getOrThrow<string>('smtp.from');

    try {
      await this.sendOnce(transporter, from, message);
    } catch (firstError) {
      this.logger.warn(
        `SMTP send failed; retrying once (${this.describeError(firstError)})`,
      );
      try {
        await this.sendOnce(transporter, from, message);
      } catch (secondError) {
        this.logger.error(
          `SMTP send failed after retry (${this.describeError(secondError)})`,
        );
        throw new ApplicationError(
          'EMAIL_DELIVERY_FAILED',
          'Unable to send email at this time.',
          503,
        );
      }
    }
  }

  private async sendOnce(
    transporter: Transporter,
    from: string,
    message: EmailMessage,
  ): Promise<void> {
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>('smtp.host');
    if (!host) {
      throw new ApplicationError(
        'EMAIL_NOT_CONFIGURED',
        'Email delivery is not configured.',
        503,
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('smtp.port') ?? 587,
      secure: this.config.get<boolean>('smtp.secure') ?? false,
      auth: this.buildAuth(),
      connectionTimeout: this.config.get<number>('smtp.timeoutMs') ?? 10_000,
      greetingTimeout: this.config.get<number>('smtp.timeoutMs') ?? 10_000,
      socketTimeout: this.config.get<number>('smtp.timeoutMs') ?? 10_000,
    });

    return this.transporter;
  }

  private buildAuth():
    | { user: string; pass: string }
    | undefined {
    const user = this.config.get<string>('smtp.user');
    const pass = this.config.get<string>('smtp.password');
    if (!user || !pass) {
      return undefined;
    }
    return { user, pass };
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.name;
    }
    return 'unknown';
  }
}
