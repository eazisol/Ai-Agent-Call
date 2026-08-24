export function buildApiUrl(path, internalBaseUrl, publicBaseUrl) {
  const baseUrl =
    internalBaseUrl || publicBaseUrl || "http://localhost:3000/api/v1";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ""), normalizedBase).toString();
}
