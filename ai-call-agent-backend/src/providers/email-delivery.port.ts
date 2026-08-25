export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailDeliveryPort {
  readonly providerName: string;
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_DELIVERY_PORT = Symbol('EMAIL_DELIVERY_PORT');
