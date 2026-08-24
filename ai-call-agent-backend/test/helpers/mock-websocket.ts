type EventHandler = (...args: unknown[]) => void;

export class MockSocket {
  static readonly OPEN = 1;

  readyState = MockSocket.OPEN;
  sentMessages: string[] = [];
  closeCalls = 0;

  private readonly handlers = new Map<string, EventHandler[]>();

  on(event: string, handler: EventHandler): this {
    const existingHandlers = this.handlers.get(event) ?? [];
    existingHandlers.push(handler);
    this.handlers.set(event, existingHandlers);

    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.handlers.get(event) ?? [];

    handlers.forEach((handler) => handler(...args));
  }

  send(message: string): void {
    this.sentMessages.push(message);
  }

  close(): void {
    this.closeCalls += 1;
    this.readyState = 3;
  }
}
