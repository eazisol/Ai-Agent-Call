import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface CallDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function CallDetailPage({ params }: CallDetailPageProps) {
    const { id } = await params;

    return (
        <DashboardLayout>
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Call Detail</h1>
                <p className="mt-1 text-sm text-gray-500">Call ID: {id}</p>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                    Transcript, recording, summary, and conclusion will appear here.
                </p>
            </div>
        </DashboardLayout>
    );
}