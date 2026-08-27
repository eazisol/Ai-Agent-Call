"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  findTimezoneOption,
  listTimezoneOptions,
  type TimezoneOption,
} from "@/lib/timezones";
import { cn } from "@/lib/utils";

type TimezoneComboboxProps = {
  id?: string;
  value: string;
  onChange: (timeZone: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export function TimezoneCombobox({
  id,
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Search timezone…",
}: TimezoneComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const options = React.useMemo(() => listTimezoneOptions(), []);
  const selected = React.useMemo(
    () => findTimezoneOption(value || "UTC"),
    [value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate text-left">{selected.label}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) => {
            const option = options.find((row) => row.id === itemValue);
            if (!option) {
              return 0;
            }
            const q = search.trim().toLowerCase();
            if (!q) {
              return 1;
            }
            return option.searchText.includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {options.map((option: TimezoneOption) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={(current) => {
                    onChange(current);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      value === option.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
