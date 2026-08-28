export const incomingCallPayload = {
  CallSid: 'CA123456789',
  From: '+15550001111',
  To: '+15550002222',
};

export const callEndedPayload = {
  CallSid: 'CA123456789',
  CallDuration: '42',
  CallStatus: 'completed',
  Timestamp: '2026-08-28T10:00:00Z',
};

export const statusCallbackFailedPayload = {
  CallSid: 'CA123456789',
  CallStatus: 'failed',
  SequenceNumber: '2',
};
