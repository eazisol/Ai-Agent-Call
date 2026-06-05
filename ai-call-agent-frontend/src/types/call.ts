export type CallStatus = 'started' | 'in_progress' | 'completed' | 'failed';

export interface Call {
    id: string;
    twilioCallSid: string;
    callerNumber?: string;
    receiverNumber?: string;
    status: CallStatus;
    startedAt?: string;
    endedAt?: string;
    duration?: number;
    summary?: string;
    conclusion?: string;
    sentiment?: string;
    createdAt: string;
}