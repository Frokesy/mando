export function formatRestaurantSchedule(
  openDays: string | null | undefined,
  openingTime: string | null | undefined,
  closingTime: string | null | undefined,
) {
  if (!openDays || !openingTime || !closingTime) return "Schedule not configured";
  return `${openDays} • ${formatClockTime(openingTime)} – ${formatClockTime(closingTime)}`;
}

export function formatClockTime(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}
