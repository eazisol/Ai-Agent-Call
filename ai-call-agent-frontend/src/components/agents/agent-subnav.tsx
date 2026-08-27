"use client";

import Link from "next/link";
import { Bot } from "lucide-react";

import { cn } from "@/lib/utils";

export function AgentSubnav({
  agentId,
  active,
}: {
  agentId: string;
  active: "overview" | "behavior" | "escalation";
}) {
  const items = [
    { id: "overview" as const, href: `/agents/${agentId}`, label: "Overview" },
    {
      id: "behavior" as const,
      href: `/agents/${agentId}/behavior`,
      label: "Behavior",
    },
    {
      id: "escalation" as const,
      href: `/agents/${agentId}/escalation`,
      label: "Escalation",
    },
  ];

  return (
    <nav
      className="flex flex-wrap gap-2 border-b pb-3"
      aria-label="Agent sections"
    >
      <Link
        href="/agents"
        className="mr-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Bot className="size-3.5" aria-hidden="true" />
        Agents
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
