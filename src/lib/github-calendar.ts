export type ContributionDay = { date: string; count: number; level: number };
export type GithubCalendar = {
  year: number;
  total: number;
  contributions: ContributionDay[];
  sourceUrl: string;
};

function attribute(tag: string, name: string) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

/** GitHub publishes anonymized private activity in the profile calendar too.
 * Parse only counts and dates; never forward upstream HTML to the browser.
 * Fail closed if GitHub changes its markup instead of displaying a partial total.
 */
export function parseGithubCalendar(html: string, year: number): Omit<GithubCalendar, "sourceUrl"> {
  const heading = html.match(/<h2\b[^>]*id="js-contribution-activity-description"[^>]*>([\s\S]*?)<\/h2>/)?.[1];
  const totalMatch = heading?.replace(/<[^>]*>/g, "").match(/([\d,]+)\s+contributions?/);
  if (!totalMatch) throw new Error("GitHub calendar total is missing");
  const total = Number(totalMatch[1].replaceAll(",", ""));
  const counts = new Map<string, number>();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)) {
    const id = attribute(match[1], "for");
    const count = match[2].replace(/<[^>]*>/g, "").trim().match(/^(No|[\d,]+) contributions? on\b/);
    if (id && count) counts.set(id, count[1] === "No" ? 0 : Number(count[1].replaceAll(",", "")));
  }
  const days = new Map<string, ContributionDay>();
  for (const match of html.matchAll(/<td\b[^>]*\bdata-date="[^>]*>/g)) {
    const date = attribute(match[0], "data-date");
    if (!date?.startsWith(`${year}-`)) continue;
    const count = counts.get(attribute(match[0], "id") ?? "");
    const rawLevel = attribute(match[0], "data-level");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || count === undefined || !/^[0-4]$/.test(rawLevel ?? "")) {
      throw new Error("GitHub calendar day is incomplete");
    }
    days.set(date, { date, count, level: Number(rawLevel) });
  }
  const contributions = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  const expectedDays = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
  if (contributions.length !== expectedDays || contributions.reduce((sum, day) => sum + day.count, 0) !== total) {
    throw new Error("GitHub calendar does not match its reported total");
  }
  if (contributions.some((day, index) => day.date !== new Date(Date.UTC(year, 0, index + 1)).toISOString().slice(0, 10))) {
    throw new Error("GitHub calendar contains invalid dates");
  }
  return { year, total, contributions };
}
