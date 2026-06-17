export interface TrendPoint {
	year: number;
	avg: number;
	enrolled: number;
}

/**
 * Enrollment-weighted average grade per year. Sections with the placeholder
 * year 1900 (the backend's "overall" rollup) are excluded.
 */
export function aggregateByYear(sections: { year: number; avg: number; pass: number; fail: number }[]): TrendPoint[] {
	const byYear = new Map<number, { sumWeighted: number; enrolled: number }>();
	for (const s of sections) {
		if (s.year === 1900) continue;
		const enrolled = s.pass + s.fail;
		const cur = byYear.get(s.year) ?? { sumWeighted: 0, enrolled: 0 };
		cur.sumWeighted += s.avg * Math.max(enrolled, 1);
		cur.enrolled += Math.max(enrolled, 1);
		byYear.set(s.year, cur);
	}
	return [...byYear.entries()]
		.map(([year, { sumWeighted, enrolled }]) => ({
			year,
			avg: Number((sumWeighted / enrolled).toFixed(2)),
			enrolled,
		}))
		.sort((a, b) => a.year - b.year);
}
