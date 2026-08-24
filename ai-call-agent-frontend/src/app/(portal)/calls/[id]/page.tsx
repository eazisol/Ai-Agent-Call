import { connection } from "next/server";
import { ApiNotice } from "@/components/feedback/ApiNotice";
import { callsApi } from "@/lib/api";

interface CallDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CallDetailPage({ params }: CallDetailPageProps) {
  await connection();
  const { id } = await params;
  const result = await callsApi.find(id);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Call Detail</h1>
        <p className="mt-1 text-sm text-gray-500">Call ID: {id}</p>
      </div>

      <div className="mt-6">
        {result.ok ? (
          <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2">
            <Detail label="Caller" value={result.data.callerNumber} />
            <Detail label="Receiver" value={result.data.receiverNumber} />
            <Detail label="Status" value={result.data.status} />
            <Detail
              label="Duration"
              value={
                result.data.duration === undefined ? undefined : `${result.data.duration}s`
              }
            />
            <Detail label="Summary" value={result.data.summary} wide />
            <Detail label="Conclusion" value={result.data.conclusion} wide />
          </div>
        ) : (
          <ApiNotice message={result.message} />
        )}
      </div>
    </>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm text-gray-800">{value || "Not available"}</p>
    </div>
  );
}
