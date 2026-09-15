"use client";

import * as React from "react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  isCommercialErrorCode,
  mapCommercialError,
  type CommercialErrorDetails,
} from "@/lib/subscription-messages";

type Props = {
  code?: string;
  message: string;
  details?: CommercialErrorDetails;
  className?: string;
};

/**
 * Maps backend commercial entitlement errors to customer-safe copy + Compare Plans CTA.
 */
export function CommercialErrorNotice({
  code,
  message,
  details,
  className,
}: Props) {
  const mapped = mapCommercialError(
    isCommercialErrorCode(code) ? code : undefined,
    message,
    details,
  );

  return (
    <Alert variant="destructive" className={className} role="alert">
      <AlertTitle>{mapped.title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{mapped.description}</p>
        {mapped.ctaHref && mapped.ctaLabel ? (
          <Button asChild size="sm" variant="outline">
            <Link href={mapped.ctaHref}>{mapped.ctaLabel}</Link>
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
