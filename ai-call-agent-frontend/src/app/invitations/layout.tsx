import type { Metadata } from "next";
import type { ReactNode } from "react";

import { InvitationsShell } from "./invitations-shell";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

/**
 * Invitation accept must work for both signed-in and anonymous users.
 * Restrictive referrer reduces invite-token leakage via Referer headers.
 */
export default function InvitationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <InvitationsShell>{children}</InvitationsShell>;
}
