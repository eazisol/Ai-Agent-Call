export type {
  CallDetailResponse,
  CallDirection,
  CallEventView,
  CallListItem,
  CallListResponse,
  CallStatus,
} from "@/lib/calls-api";

/** @deprecated Use CallListItem from calls-api for tenant-scoped call views. */
export type Call = import("@/lib/calls-api").CallListItem;
