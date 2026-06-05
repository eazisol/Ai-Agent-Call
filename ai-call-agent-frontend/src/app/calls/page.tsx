import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CallsTable } from '@/components/calls/CallsTable';
import { api } from '@/lib/api';
import { Call } from '@/types/call';

async function getCalls(): Promise<Call[]> {
    const response = await api.get('/calls');

    return response.data;
}

export default async function CallsPage() {
    const calls = await getCalls();

    return (
        <DashboardLayout>
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    Call History
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    View incoming AI call records and statuses.
                </p>
            </div>

            <div className="mt-6">
                <CallsTable calls={calls} />
            </div>
        </DashboardLayout>
    );
}