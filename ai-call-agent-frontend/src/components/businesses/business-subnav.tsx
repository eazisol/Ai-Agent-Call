"use client";

import Link from "next/link";
import { Store } from "lucide-react";

import { cn } from "@/lib/utils";

export function BusinessSubnav({
  businessId,
  active,
}: {
  businessId: string;
  active: "overview" | "settings" | "hours";
}) {
  const items = [
    { id: "overview" as const, href: `/businesses/${businessId}`, label: "Overview" },
    {
      id: "settings" as const,
      href: `/businesses/${businessId}/settings`,
      label: "Settings",
    },
    {
      id: "hours" as const,
      href: `/businesses/${businessId}/hours`,
      label: "Hours",
    },
  ];

  return (
    <nav
      className="flex flex-wrap gap-2 border-b pb-3"
      aria-label="Business sections"
    >
      <Link
        href="/businesses"
        className="mr-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Store className="size-3.5" aria-hidden="true" />
        Businesses
      </Link>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm",
            active === item.id
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
