"use client";

import * as React from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useShellNavigation } from "./shell-navigation";

/**
 * Breadcrumbs — accessible header breadcrumbs.
 *
 * Rules: organization never appears (it lives in the switcher), max ~3
 * levels, long entity names truncate. Items without href render as the
 * current page (aria-current="page").
 */
export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { navigate } = useShellNavigation();

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        {items.map((crumb, i) => {
          const isLast = i === items.length - 1;
          return (
            <React.Fragment key={`${crumb.label}-${i}`}>
              {i > 0 ? <BreadcrumbSeparator aria-hidden="true" /> : null}
              <BreadcrumbItem className="min-w-0">
                {isLast || !crumb.href ? (
                  <BreadcrumbPage className="max-w-40 truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <a
                      href={crumb.href}
                      className="max-w-40 truncate"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(crumb.href!);
                      }}
                    >
                      {crumb.label}
                    </a>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
