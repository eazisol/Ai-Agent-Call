"use client";

export default function CallsError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-red-950">Calls view unavailable</h1>
      <p className="mt-2 text-sm text-red-800">
        EaziAiCall could not render this view. You can safely try again.
      </p>
      <button
        type="button"
        onClick={unstable_retry}
        className="mt-4 rounded-xl bg-red-900 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
