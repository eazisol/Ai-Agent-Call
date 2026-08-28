import { StatusBadge } from "@/components/patterns/status-badge";
import {
  callStatusBadge,
  formatCallStatus,
  type CallStatus,
} from "@/lib/calls-api";

export function CallStatusBadge({ status }: { status: CallStatus }) {
  return (
    <StatusBadge status={callStatusBadge(status)}>
      {formatCallStatus(status)}
    </StatusBadge>
  );
}
