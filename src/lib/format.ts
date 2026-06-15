const APP_TIME_ZONE = "America/Toronto";

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  const dayPeriod = part("dayPeriod").replace(/\./g, "").toUpperCase();

  return `${part("year")}-${part("month")}-${part("day")}, ${part("hour")}:${part(
    "minute"
  )}:${part("second")} ${dayPeriod}`;
}
