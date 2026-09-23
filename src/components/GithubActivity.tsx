"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContributionDay as Day, GithubCalendar } from "@/lib/github-calendar";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Groups a flat list of days (oldest first) into Sunday-start weeks, padding the first week. */
function toWeeks(days: Day[]): (Day | null)[][] {
  if (days.length === 0) return [];
  const weeks: (Day | null)[][] = [];
  let week: (Day | null)[] = new Array(new Date(days[0].date + "T00:00:00").getDay()).fill(null);
  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  return weeks;
}

/**
 * Live, interactive GitHub contribution graph for xingexu. Hovering a day shows
 * a tooltip; clicking one opens that exact day on the real GitHub profile.
 */
export default function GithubActivity({ username, profileUrl }: { username: string; profileUrl: string }) {
  const [data, setData] = useState<GithubCalendar | null>(null);
  const [failed, setFailed] = useState(false);
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const [attempt, setAttempt] = useState(0);
  const currentYear = new Date().getUTCFullYear();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch(`/api/github?year=${year}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json() as Promise<GithubCalendar>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [year, attempt]);

  const weeks = useMemo(() => toWeeks(data?.contributions ?? []), [data]);

  const monthMarkers = useMemo(() => {
    const markers: { week: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const firstDay = week.find((d): d is Day => d !== null);
      if (!firstDay) return;
      const month = new Date(firstDay.date + "T00:00:00").getMonth();
      if (month !== lastMonth) {
        markers.push({ week: i, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
    });
    return markers;
  }, [weeks]);

  const total = data?.total;

  return (
    <section className="github-activity px-panel" aria-labelledby="github-activity-title" aria-busy={!data && !failed}>
      <div className="github-activity-header">
        <div>
          <h2 id="github-activity-title" className="font-pixel drift-card-title">
            GITHUB ACTIVITY
          </h2>
          <p className="github-activity-sub" role="status">
            {total !== undefined ? `${total.toLocaleString()} contributions in ${data?.year}` : "live from github.com"}
          </p>
        </div>
        <div className="github-activity-controls">
          <label className="sr-only" htmlFor="github-year">Contribution year</label>
          <select id="github-year" className="github-year-select" value={year} onChange={(event) => {
            setYear(Number(event.target.value));
            setData(null);
            setFailed(false);
          }}>
            {Array.from({ length: 4 }, (_, i) => currentYear - i).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <a href={profileUrl} target="_blank" rel="noreferrer" className="px-btn px-btn-secondary">
            @{username} <span aria-hidden>→</span>
          </a>
        </div>
      </div>

      {failed && (
        <p className="github-activity-sub" role="status" style={{ marginTop: 4 }}>
          Couldn&apos;t load live activity right now — see it directly on{" "}
          <a href={profileUrl} target="_blank" rel="noreferrer" className="github-activity-fallback-link">
            GitHub
          </a>
          .
          {" "}<button className="github-activity-retry" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>Try again</button>
        </p>
      )}

      {!failed && weeks.length > 0 && (
        <div className="github-activity-calendar" key={data?.year}>
          <div className="github-activity-scroll" role="region" aria-label={`${data?.year} contribution calendar`} tabIndex={0}>
            <div className="github-activity-grid">
              <div className="github-activity-months" aria-hidden="true">
                {monthMarkers.map((m) => (
                  <span key={`${m.week}-${m.label}`} style={{ gridColumnStart: m.week + 1 }}>
                    {m.label}
                  </span>
                ))}
              </div>
              <div className="github-activity-weeks">
                {weeks.map((week, wi) => (
                  <div className="github-activity-week" key={wi}>
                    {week.map((day, di) =>
                      day ? (
                        <a
                          key={day.date}
                          href={`${profileUrl}?tab=overview&from=${day.date}&to=${day.date}`}
                          target="_blank"
                          rel="noreferrer"
                          className="github-activity-day"
                          data-level={day.level}
                          data-tooltip={`${day.count} contribution${day.count === 1 ? "" : "s"} · ${day.date}`}
                          aria-label={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}
                        />
                      ) : (
                        <span key={di} className="github-activity-day" data-level="empty" aria-hidden="true" />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="github-activity-footer">
            <span className="github-activity-sub">hover for details</span>
            <div className="github-activity-legend" aria-hidden="true">
              <span>less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <span key={level} className="github-activity-day" data-level={level} />
              ))}
              <span>more</span>
            </div>
          </div>
        </div>
      )}

      {!failed && weeks.length === 0 && <div className="github-activity-loading" role="status"><span className="github-activity-sub">loading activity from GitHub…</span></div>}
    </section>
  );
}
