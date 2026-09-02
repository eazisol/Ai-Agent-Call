import { apiRequest, type ApiResult } from "./api-client";
﻿
export type TelephonyProviderStatus = {
  provider: string;
  configured: boolean;
  credentialsValid: boolean;
  credentialsMessage: string | null;
  webhookSignatureValidation: boolean;
  webhookUrls: {
    incomingCall: string;
    statusCallback: string;
  } | null;
  activePhoneNumbers: number;
};

export function telephonyStatusBadge(
  status: TelephonyProviderStatus | null,
): "success" | "warning" | "error" | "neutral" {
  if (!status?.configured) {
    return "neutral";
  }
  if (status.credentialsValid) {
    return "success";
  }
  return "error";
}

export function formatTelephonyStatus(
  status: TelephonyProviderStatus | null,
): string {
  if (!status) {
    return "Unknown";
  }
  if (!status.configured) {
    return "Not configured";
  }
  if (status.credentialsValid) {
    return "Connected";
  }
  return "Credential error";
}

async function telephonyRequest<T>(
  path: string,
  init?: Parameters<typeof apiRequest>[1],
): Promise<ApiResult<T>> {
  return apiRequest<T>(path, {
    unavailableMessage:
      "The telephony provider status could not be loaded. Check your connection and try again.",
    timeoutMessage:
      "The telephony provider status request timed out. Check your connection and try again.",
    ...init,
  });
}

export const telephonyApi = {
  providerStatus: (options?: { timeoutMs?: number }) =>
    telephonyRequest<{ status: TelephonyProviderStatus }>("telephony/provider-status", {
      timeoutMs: options?.timeoutMs,
    }),
};
