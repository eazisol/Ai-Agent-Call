import { OpenaiRealtimeService } from '../openai-realtime/openai-realtime.service';
import { VoiceStreamGateway } from './voice-stream.gateway';
import { MockSocket } from '../../../test/helpers/mock-websocket';

describe('VoiceStreamGateway', () => {
  let gateway: VoiceStreamGateway;
  let clientSocket: MockSocket;
  let openAiSocket: MockSocket;

  beforeEach(() => {
    clientSocket = new MockSocket();
    openAiSocket = new MockSocket();

    gateway = new VoiceStreamGateway({
      createRealtimeConnection: jest.fn(() => openAiSocket),
    } as unknown as OpenaiRealtimeService);
  });

  it('forwards OpenAI audio deltas to Twilio after the start event sets a streamSid', () => {
    gateway.handleConnection(clientSocket as never);

    clientSocket.emit(
      'message',
      Buffer.from(
        JSON.stringify({
          event: 'start',
          start: {
            callSid: 'CA-voice-1',
            streamSid: 'MZ-stream-1',
          },
        }),
      ),
    );

    openAiSocket.emit(
      'message',
      Buffer.from(
        JSON.stringify({
          type: 'response.audio.delta',
          delta: 'base64-audio',
        }),
      ),
    );

    expect(clientSocket.sentMessages).toEqual([
      JSON.stringify({
        event: 'media',
        streamSid: 'MZ-stream-1',
        media: {
          payload: 'base64-audio',
        },
      }),
    ]);
  });

  it('does not forward audio deltas before the Twilio start event', () => {
    gateway.handleConnection(clientSocket as never);

    openAiSocket.emit(
      'message',
      Buffer.from(
        JSON.stringify({
          type: 'response.audio.delta',
          delta: 'base64-audio',
        }),
      ),
    );

    expect(clientSocket.sentMessages).toHaveLength(0);
  });

  it('sends Twilio media payloads to OpenAI as input_audio_buffer.append events', () => {
    gateway.handleConnection(clientSocket as never);

    clientSocket.emit(
      'message',
      Buffer.from(
        JSON.stringify({
          event: 'media',
          media: {
            payload: 'twilio-audio',
          },
        }),
      ),
    );

    expect(openAiSocket.sentMessages).toEqual([
      JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: 'twilio-audio',
      }),
    ]);
  });

  it('closes both sockets when Twilio sends a stop event', () => {
    gateway.handleConnection(clientSocket as never);

    clientSocket.emit(
      'message',
      Buffer.from(JSON.stringify({ event: 'stop' })),
    );

    expect(openAiSocket.closeCalls).toBe(1);
    expect(clientSocket.closeCalls).toBe(1);
  });
});
