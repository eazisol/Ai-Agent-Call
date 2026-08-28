import { buildApiUrl } from "./api-url.mjs";

export function getApiBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_BASE_URL;
}

export { buildApiUrl };
