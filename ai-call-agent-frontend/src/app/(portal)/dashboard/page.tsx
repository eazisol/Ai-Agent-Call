import { StatCard } from "@/components/cards/StatCard";

export default function DashboardPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of EaziAiCall activity. Live stats arrive with Call Management
          / Analytics modules; cards below are empty placeholders for now.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Total Calls" value="—" />
        <StatCard title="Completed Calls" value="—" />
        <StatCard title="Failed Calls" value="—" />
        <StatCard title="Avg Duration" value="—" />
      </div>
    </>
  );
}
