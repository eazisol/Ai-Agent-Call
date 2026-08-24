"use client";

import type * as React from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-card",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:border-border group-[.toast]:bg-background",
          success:
            "group-[.toaster]:border-success/30 group-[.toaster]:bg-success/10 group-[.toaster]:text-success-strong",
          error:
            "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive-strong",
          warning:
            "group-[.toaster]:border-warning/40 group-[.toaster]:bg-warning/15 group-[.toaster]:text-warning-strong",
          info: "group-[.toaster]:border-info/30 group-[.toaster]:bg-info/10 group-[.toaster]:text-info-strong",
          loading: "group-[.toaster]:border-border group-[.toaster]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
