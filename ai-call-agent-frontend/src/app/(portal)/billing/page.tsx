import { redirect } from "next/navigation";

/** Legacy mock `/billing` route — redirect to M25 Plan settings (not M27 billing). */
export default function BillingRedirectPage() {
  redirect("/settings/plan");
}
