import { connection } from "next/server";
import { CallsTable } from "@/components/calls/CallsTable";
import { ApiNotice } from "@/components/feedback/ApiNotice";
import { callsApi } from "@/lib/api";

export default async function CallsPage() {
  await connection();
  const result = await callsApi.list();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Call History</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review incoming EaziAiCall activity and call outcomes.
        </p>
      </div>

      <div className="mt-6">
        {result.ok ? <CallsTable calls={result.data} /> : <ApiNotice message={result.message} />}
      </div>
    </>
  );
}
