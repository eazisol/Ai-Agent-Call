import { redirect } from "next/navigation";

/** Legacy preview route — canonical marketing home is `/`. */
export default function MarketingShellRedirectPage() {
  redirect("/");
}