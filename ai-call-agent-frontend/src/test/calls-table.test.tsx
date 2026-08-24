import { render, screen } from '@testing-library/react';
import { CallsTable } from '@/components/calls/CallsTable';
import { Call } from '@/types/call';

describe('CallsTable', () => {
    it('renders the empty state when there are no calls', () => {
        render(<CallsTable calls={[]} />);

        expect(screen.getByText('No calls found.')).toBeInTheDocument();
    });

    it('renders an error message when call loading fails', () => {
        render(
            <CallsTable
                calls={[]}
                errorMessage="Unable to load calls right now."
            />,
        );

        expect(
            screen.getByText('Unable to load calls right now.'),
        ).toBeInTheDocument();
    });

    it('renders call rows when data is available', () => {
        const calls: Call[] = [
            {
                id: 'call-1',
                twilioCallSid: 'CA-1',
                callerNumber: '+15550001111',
                receiverNumber: '+15550002222',
                status: 'completed',
                duration: 18,
                startedAt: '2026-08-24T12:00:00.000Z',
                createdAt: '2026-08-24T12:00:00.000Z',
            },
        ];

        render(<CallsTable calls={calls} />);

        expect(screen.getByText('+15550001111')).toBeInTheDocument();
        expect(screen.getByText('18s')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
            'href',
            '/calls/call-1',
        );
    });
});
