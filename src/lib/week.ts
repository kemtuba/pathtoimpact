import { defaultTimezone } from "./env";

/**
 * Week keys, section 4.1 of the plan: the ISO 8601 week that contains the run
 * date in the operator's timezone, except that a Sunday belongs to the
 * following week, because the Sunday run prepares the week ahead. A Tuesday
 * catch-up push therefore lands in the same week as that Sunday's run.
 * Keys look like "2026-W44".
 */

export type WeekKey = `${number}-W${string}`;

const DAY_MS = 86_400_000;

type LocalDate = { year: number; month: number; day: number; weekday: number };

/** The calendar date and ISO weekday (Monday 1 to Sunday 7) of an instant in a timezone. */
export function localDate(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdays: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdays[get("weekday")],
  };
}

/** ISO week-numbering year and week of a calendar date, computed in UTC to avoid DST. */
export function isoWeek(year: number, month: number, day: number): { year: number; week: number } {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday); // the Thursday of this ISO week
  const isoYear = date.getUTCFullYear();
  const jan1 = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((date.getTime() - jan1) / DAY_MS + 1) / 7);
  return { year: isoYear, week };
}

function format(year: number, week: number): WeekKey {
  return `${year}-W${String(week).padStart(2, "0")}` as WeekKey;
}

export function weekKey(instant: Date = new Date(), timeZone: string = defaultTimezone()): WeekKey {
  const local = localDate(instant, timeZone);
  const base = new Date(Date.UTC(local.year, local.month - 1, local.day));
  if (local.weekday === 7) base.setUTCDate(base.getUTCDate() + 1); // Sunday prepares the coming week
  const { year, week } = isoWeek(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
  return format(year, week);
}

export function parseWeekKey(key: string): { year: number; week: number } {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) throw new Error(`Not a week key: ${key}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) throw new Error(`Week out of range: ${key}`);
  return { year, week };
}

/** The Monday, as a UTC date, that starts an ISO week. */
export function mondayOf(key: string): Date {
  const { year, week } = parseWeekKey(key);
  const jan4 = new Date(Date.UTC(year, 0, 4)); // always in ISO week 1
  const jan4Weekday = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime() - (jan4Weekday - 1) * DAY_MS + (week - 1) * 7 * DAY_MS);
  const check = isoWeek(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
  if (check.year !== year || check.week !== week) throw new Error(`No such ISO week: ${key}`);
  return monday;
}

export function previousWeekKey(key: string): WeekKey {
  const previous = new Date(mondayOf(key).getTime() - 7 * DAY_MS);
  const { year, week } = isoWeek(previous.getUTCFullYear(), previous.getUTCMonth() + 1, previous.getUTCDate());
  return format(year, week);
}
