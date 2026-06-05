import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/cards/StatCard';

export default function DashboardPage() {
    return (
        <DashboardLayout>
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Overview of AI call activity and system performance.
                </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <StatCard title="Total Calls" value="0" />
                <StatCard title="Completed Calls" value="0" />
                <StatCard title="Failed Calls" value="0" />
                <StatCard title="Avg Duration" value="0s" />
            </div>
        </DashboardLayout>
    );
}