import { StatusBadge } from "@/components/patterns/status-badge";
import {
  formatPhoneNumberStatus,
  phoneNumberStatusBadge,
  type PhoneNumberStatus,
} from "@/lib/phone-numbers-api";

export function PhoneNumberStatusBadge({
  status,
}: {
  status: PhoneNumberStatus;
}) {
  return (
    <StatusBadge status={phoneNumberStatusBadge(status)}>
      {formatPhoneNumberStatus(status)}
    </StatusBadge>
  );
}
