"use client";

import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { notifications, type PortalNotification } from "@/mocks/portal-shell";
import { toastComingSoon } from "./portal-nav";

/**
 * NotificationMenu — bell with unread badge + compact popover (chrome only).
 */

const toneClasses: Record<PortalNotification["tone"], string> = {
  info: "bg-info/10 text-info-strong",
  success: "bg-success/10 text-success-strong",
  warning: "bg-warning/15 text-warning-strong",
};

export function NotificationMenu({
  items = notifications,
}: {
  items?: PortalNotification[] | undefined;
}) {
  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications, ${unreadCount} unread`}
          className="relative"
        >
          <Bell className="size-4" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground"
            >
              {unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => toastComingSoon("Notification management arrives in a future module.")}
          >
            Mark all read
          </Button>
        </div>
        <ul className="max-h-80 divide-y overflow-y-auto">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => toastComingSoon("Notification detail arrives in a future module.")}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                  n.unread && "bg-primary/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    toneClasses[n.tone],
                  )}
                >
                  <n.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{n.title}</span>
                    {n.unread ? (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {n.description}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{n.time}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => toastComingSoon("The notifications center arrives in a future module.")}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
