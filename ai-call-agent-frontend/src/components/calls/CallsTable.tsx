import Link from 'next/link';
import { Call } from '@/types/call';

interface CallsTableProps {
    calls: Call[];
}

export function CallsTable({ calls }: CallsTableProps) {
    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-gray-500">
                    <tr>
                        <th className="px-5 py-3">Caller</th>
                        <th className="px-5 py-3">Receiver</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Duration</th>
                        <th className="px-5 py-3">Started</th>
                        <th className="px-5 py-3">Action</th>
                    </tr>
                </thead>

                <tbody>
                    {calls.length === 0 ? (
                        <tr>
                            <td className="px-5 py-6 text-center text-gray-400" colSpan={6}>
                                No calls found.
                            </td>
                        </tr>
                    ) : (
                        calls.map((call) => (
                            <tr key={call.id} className="border-b last:border-0">
                                <td className="px-5 py-3">{call.callerNumber || '-'}</td>
                                <td className="px-5 py-3">{call.receiverNumber || '-'}</td>
                                <td className="px-5 py-3">
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-700">
                                        {call.status}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    {call.duration ? `${call.duration}s` : '-'}
                                </td>
                                <td className="px-5 py-3">
                                    {call.startedAt
                                        ? new Date(call.startedAt).toLocaleString()
                                        : '-'}
                                </td>
                                <td className="px-5 py-3">
                                    <Link
                                        href={`/calls/${call.id}`}
                                        className="text-blue-600 hover:underline"
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}