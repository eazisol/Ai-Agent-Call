"use client";

import { cn } from "@/lib/utils";
import {
  DAY_LABELS,
  type BusinessHour,
} from "@/lib/businesses-api";

const selectClassName = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export function closedWeek(): BusinessHour[] {
  return DAY_LABELS.map((_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: true,
    opensAt: null,
    closesAt: null,
  }));
}

export function BusinessHoursEditor({
  hours,
  onChange,
  disabled,
}: {
  hours: BusinessHour[];
  onChange: (hours: BusinessHour[]) => void;
  disabled?: boolean;
}) {
  const rows = DAY_LABELS.map((_, dayOfWeek) => {
    return (
      hours.find((hour) => hour.dayOfWeek === dayOfWeek) ?? {
        dayOfWeek,
        isClosed: true,
        opensAt: null,
        closesAt: null,
      }
    );
  });

  const update = (dayOfWeek: number, patch: Partial<BusinessHour>) => {
    onChange(
      rows.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row,
      ),
    );
  };

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[7rem_5rem_1fr_1fr] gap-2 text-xs text-muted-foreground sm:grid">
        <span>Day</span>
        <span>Closed</span>
        <span>Opens</span>
        <span>Closes</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.dayOfWeek}
          className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[7rem_5rem_1fr_1fr] sm:items-center sm:border-0 sm:p-0"
        >
          <span className="text-sm font-medium">{DAY_LABELS[row.dayOfWeek]}</span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={row.isClosed}
              disabled={disabled}
              onChange={(event) =>
                update(row.dayOfWeek, {
                  isClosed: event.target.checked,
                  opensAt: event.target.checked ? null : row.opensAt ?? "09:00",
                  closesAt: event.target.checked ? null : row.closesAt ?? "17:00",
                })
              }
            />
            Closed
          </label>
          <input
            type="time"
            className={selectClassName}
            disabled={disabled || row.isClosed}
            value={row.opensAt ?? ""}
            onChange={(event) =>
              update(row.dayOfWeek, { opensAt: event.target.value || null })
            }
            aria-label={`${DAY_LABELS[row.dayOfWeek]} opens`}
          />
          <input
            type="time"
            className={selectClassName}
            disabled={disabled || row.isClosed}
            value={row.closesAt ?? ""}
            onChange={(event) =>
              update(row.dayOfWeek, { closesAt: event.target.value || null })
            }
            aria-label={`${DAY_LABELS[row.dayOfWeek]} closes`}
          />
        </div>
      ))}
    </div>
  );
}
