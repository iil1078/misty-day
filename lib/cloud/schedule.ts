import type { Frequency, Schedule } from "./types";

type Timing = Pick<Schedule, "frequency" | "weekday" | "monthDay" | "time">;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function at(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
}

/** The first run strictly after `after`. */
export function computeNextRun(timing: Timing, after: Date): Date {
  if (timing.frequency === "daily") {
    const today = at(after, timing.time);
    return today > after ? today : at(new Date(after.getFullYear(), after.getMonth(), after.getDate() + 1), timing.time);
  }
  if (timing.frequency === "weekly") {
    const delta = (timing.weekday - after.getDay() + 7) % 7;
    const candidate = at(new Date(after.getFullYear(), after.getMonth(), after.getDate() + delta), timing.time);
    return candidate > after ? candidate : at(new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate() + 7), timing.time);
  }
  const thisMonth = at(new Date(after.getFullYear(), after.getMonth(), timing.monthDay), timing.time);
  return thisMonth > after ? thisMonth : at(new Date(after.getFullYear(), after.getMonth() + 1, timing.monthDay), timing.time);
}

export function upcomingRuns(timing: Timing, after: Date, count: number): Date[] {
  const runs: Date[] = [];
  let cursor = after;
  for (let i = 0; i < count; i++) {
    cursor = computeNextRun(timing, cursor);
    runs.push(cursor);
  }
  return runs;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function describeTiming(timing: Timing): string {
  const t = formatTime(timing.time);
  switch (timing.frequency) {
    case "daily":
      return `Every day at ${t}`;
    case "weekly":
      return `Every ${WEEKDAYS[timing.weekday]} at ${t}`;
    case "monthly":
      return `Monthly on the ${ordinal(timing.monthDay)} at ${t}`;
  }
}

export const FREQUENCY_LABELS: Record<Frequency, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
