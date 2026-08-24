import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import WebSocket from 'ws';
import { OpenaiRealtimeService } from './openai-realtime.service';

type SocketHandler = (...args: unknown[]) => void;

interface MockWebSocketInstance {
  on: jest.Mock<MockWebSocketInstance, [string, SocketHandler]>;
  send: jest.Mock<void, [string]>;
  close: jest.Mock<void, []>;
}

const socketHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockWebSocketInstance: MockWebSocketInstance = {
  on: jest.fn((event: string, handler: SocketHandler) => {
    socketHandlers[event] = handler;

    return mockWebSocketInstance;
  }),
  send: jest.fn<void, [string]>(),
  close: jest.fn<void, []>(),
};

jest.mock('ws', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const webSocketConstructor = WebSocket as unknown as jest.Mock<
  MockWebSocketInstance,
  [string, { headers: Record<string, string> }]
>;

webSocketConstructor.mockImplementation(() => mockWebSocketInstance);

describe('OpenaiRealtimeService', () => {
  let service: OpenaiRealtimeService;
  const configService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    Object.keys(socketHandlers).forEach((key) => {
      delete socketHandlers[key];
    });
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      if (key === 'openai.apiKey') {
        return 'test-api-key';
      }

      if (key === 'openai.realtimeModel') {
        return 'gpt-realtime';
      }

      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenaiRealtimeService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<OpenaiRealtimeService>(OpenaiRealtimeService);
  });

  it('creates a realtime websocket with the configured URL and headers', () => {
    const socket = service.createRealtimeConnection();

    expect(webSocketConstructor).toHaveBeenCalledWith(
      'wss://api.openai.com/v1/realtime?model=gpt-realtime',
      {
        headers: {
          Authorization: 'Bearer test-api-key',
          'OpenAI-Beta': 'realtime=v1',
        },
      },
    );
    expect(socket).toBe(mockWebSocketInstance);
  });

  it('sends a session.update payload when the socket opens', () => {
    service.createRealtimeConnection();

    expect(typeof socketHandlers.open).toBe('function');
    socketHandlers.open();

    expect(mockWebSocketInstance.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          voice: 'alloy',
          instructions:
            'You are a helpful AI customer support representative. Speak clearly and professionally.',
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          turn_detection: {
            type: 'server_vad',
          },
        },
      }),
    );
  });
});
