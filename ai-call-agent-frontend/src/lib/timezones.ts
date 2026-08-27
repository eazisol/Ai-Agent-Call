/**
 * IANA timezone helpers for searchable pickers.
 * Uses the runtime Intl database (all supported zones) — no hard-coded short list.
 */

export type TimezoneOption = {
  /** IANA id stored in the API (e.g. Asia/Karachi) */
  id: string;
  /** UTC offset label (e.g. UTC+05:00) */
  offsetLabel: string;
  /** Human place/region hint (e.g. Pakistan) */
  placeLabel: string;
  /** Full row label for the combobox */
  label: string;
  /** Lowercased haystack for client search */
  searchText: string;
  /** Offset minutes east of UTC (for sorting) */
  offsetMinutes: number;
};

function stripTimeSuffix(name: string): string {
  return name
    .replace(
      /\s+(Standard|Daylight|Summer|Winter|Generic)?\s*Time$/i,
      "",
    )
    .replace(/\s+Time$/i, "")
    .trim();
}

function parseOffsetToMinutes(raw: string): number {
  if (!raw || raw === "GMT" || raw === "UTC") {
    return 0;
  }
  const match = raw.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) {
    return 0;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function formatOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (abs % 60).toString().padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

/** Compact display like `+5` when minutes are zero; otherwise `+5:30`. */
export function formatCompactOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) {
    return "UTC";
  }
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) {
    return `${sign}${hours}`;
  }
  return `${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
}

export function getTimezoneOffsetMinutes(
  timeZone: string,
  date: Date = new Date(),
): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(date);
    const raw =
      parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
    return parseOffsetToMinutes(raw.replace(/^UTC/i, "GMT"));
  } catch {
    return 0;
  }
}

export function getTimezonePlaceLabel(
  timeZone: string,
  date: Date = new Date(),
): string {
  if (timeZone === "UTC" || timeZone === "Etc/UTC") {
    return "Coordinated Universal Time";
  }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "long",
    }).formatToParts(date);
    const raw =
      parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    const cleaned = stripTimeSuffix(raw);
    if (cleaned) {
      return cleaned;
    }
  } catch {
    // fall through
  }
  const city = timeZone.split("/").pop()?.replaceAll("_", " ") ?? timeZone;
  return city;
}

export function formatTimezoneLabel(
  timeZone: string,
  date: Date = new Date(),
): string {
  const offsetMinutes = getTimezoneOffsetMinutes(timeZone, date);
  const offsetLabel = formatOffsetLabel(offsetMinutes);
  const place = getTimezonePlaceLabel(timeZone, date);
  const compact = formatCompactOffset(offsetMinutes);
  return `${offsetLabel} (${compact} ${place}) · ${timeZone}`;
}

export function buildTimezoneOption(
  timeZone: string,
  date: Date = new Date(),
): TimezoneOption {
  const offsetMinutes = getTimezoneOffsetMinutes(timeZone, date);
  const offsetLabel = formatOffsetLabel(offsetMinutes);
  const placeLabel = getTimezonePlaceLabel(timeZone, date);
  const compact = formatCompactOffset(offsetMinutes);
  const label = `${offsetLabel} (${compact} ${placeLabel}) · ${timeZone}`;
  return {
    id: timeZone,
    offsetLabel,
    placeLabel,
    label,
    offsetMinutes,
    searchText: `${label} ${compact} ${placeLabel} ${timeZone}`
      .toLowerCase()
      .replaceAll("_", " "),
  };
}

let cachedOptions: TimezoneOption[] | null = null;
let cachedAtDay: string | null = null;

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

/** All IANA zones supported by the runtime, sorted by offset then id. */
export function listTimezoneOptions(date: Date = new Date()): TimezoneOption[] {
  const key = dayKey(date);
  if (cachedOptions && cachedAtDay === key) {
    return cachedOptions;
  }

  const supported =
    typeof Intl !== "undefined" &&
    "supportedValuesOf" in Intl &&
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC"];

  const ids = new Set<string>(supported);
  ids.add("UTC");

  const options = [...ids]
    .map((id) => buildTimezoneOption(id, date))
    .sort((a, b) => {
      if (a.offsetMinutes !== b.offsetMinutes) {
        return a.offsetMinutes - b.offsetMinutes;
      }
      return a.id.localeCompare(b.id);
    });

  cachedOptions = options;
  cachedAtDay = key;
  return options;
}

export function findTimezoneOption(
  timeZone: string,
  date: Date = new Date(),
): TimezoneOption {
  const match = listTimezoneOptions(date).find((option) => option.id === timeZone);
  return match ?? buildTimezoneOption(timeZone, date);
}

