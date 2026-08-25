import * as React from "react";
import { PhoneCall } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-xl border bg-card px-6 py-8 shadow-card sm:px-8",
        className,
      )}
    >
      <div className="mb-6 flex flex-col items-center text-center">
        <Link
          href="/login"
          className="mb-4 flex items-center gap-2.5 text-foreground"
          aria-label="EaziAICall"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <PhoneCall className="size-4" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            EaziAICall
          </span>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
      {footer ? (
        <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
