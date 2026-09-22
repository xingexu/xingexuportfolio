import { LINKS } from "@/app/data";
import { parseGithubCalendar } from "@/lib/github-calendar";

export async function GET(request: Request) {
  const currentYear = new Date().getUTCFullYear();
  const year = Number(new URL(request.url).searchParams.get("year") ?? currentYear);
  if (!Number.isInteger(year) || year < currentYear - 10 || year > currentYear) {
    return Response.json({ error: "Invalid contribution year" }, { status: 400 });
  }

  const username = new URL(LINKS.github).pathname.slice(1);
  const sourceUrl = `https://github.com/users/${encodeURIComponent(username)}/contributions?from=${year}-01-01&to=${year}-12-31`;
  try {
    const response = await fetch(sourceUrl, {
      headers: { Accept: "text/html", "Accept-Language": "en-US" },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const calendar = parseGithubCalendar(await response.text(), year);
    return Response.json({ ...calendar, sourceUrl }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return Response.json({ error: "GitHub activity is temporarily unavailable" }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
