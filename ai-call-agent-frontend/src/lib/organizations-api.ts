import { apiRequest } from "./api-client";

export type OrganizationRole = "owner" | "admin" | "manager" | "viewer";

export type Organization = {
  id: string;
  name: string;
  slug: string | null;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
};

/** Organizations client — credentials cookies only; no request body logging. */
export const organizationsApi = {
  list: () => apiRequest<{ organizations: Organization[] }>("organizations"),

  get: (id: string) =>
    apiRequest<{ organization: Organization }>(
      `organizations/${encodeURIComponent(id)}`,
    ),

  create: (input: { name: string; slug?: string }) =>
    apiRequest<{ organization: Organization }>("organizations", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: { name?: string; slug?: string | null }) =>
    apiRequest<{ organization: Organization }>(
      `organizations/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),

  getActive: () =>
    apiRequest<{ organization: Organization | null }>("organizations/active"),

  setActive: (organizationId: string) =>
    apiRequest<{ organization: Organization }>("organizations/active", {
      method: "POST",
      body: JSON.stringify({ organizationId }),
    }),

  clearActive: () =>
    apiRequest<{ cleared: true }>("organizations/active", {
      method: "DELETE",
    }),
};
