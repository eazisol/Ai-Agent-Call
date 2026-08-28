import { TableSkeleton } from "@/components/patterns/loading-state";

export default function CallsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
