import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGithubCalendar } from '../src/lib/github-calendar.ts';

function calendar(year) {
  const days = [];
  for (let date = new Date(Date.UTC(year, 0, 1)); date.getUTCFullYear() === year; date.setUTCDate(date.getUTCDate() + 1)) {
    const iso = date.toISOString().slice(0, 10);
    const count = iso.endsWith('01-01') ? '10,634' : 'No';
    days.unshift(`<td data-date="${iso}" id="day-${iso}" data-level="${count === 'No' ? 0 : 4}"></td><tool-tip for="day-${iso}">${count} contributions on date.</tool-tip>`);
  }
  return `<h2 id="js-contribution-activity-description">10,634 contributions in ${year}</h2>${days.join('')}`;
}

test('preserves the full GitHub total, comma counts, zero days, and chronological order', () => {
  const result = parseGithubCalendar(calendar(2026), 2026);
  assert.equal(result.total, 10634);
  assert.equal(result.contributions.length, 365);
  assert.deepEqual(result.contributions[0], { date: '2026-01-01', count: 10634, level: 4 });
  assert.deepEqual(result.contributions.at(-1), { date: '2026-12-31', count: 0, level: 0 });
});

test('handles leap years', () => {
  const result = parseGithubCalendar(calendar(2024), 2024);
  assert.equal(result.contributions.length, 366);
  assert.ok(result.contributions.some((day) => day.date === '2024-02-29'));
});

test('rejects incomplete or changed GitHub markup instead of undercounting', () => {
  assert.throws(() => parseGithubCalendar('<html>Rate limited</html>', 2026));
  assert.throws(() => parseGithubCalendar(calendar(2026).replace('10,634 contributions in', '99 contributions in'), 2026));
  assert.throws(() => parseGithubCalendar(calendar(2026).replace('data-date="2026-12-31"', ''), 2026));
  assert.throws(() => parseGithubCalendar(calendar(2026).replace('No contributions on date.', 'Changed format'), 2026));
});
