// ===== Shared domain types =====

export interface Course {
	id: string;
	title: string;
	dept: string;
	code: string;
	links?: {
		self: string;
		sections: string;
	};
}

export interface Section {
	id: string;
	instructor: string;
	year: number;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
}

export interface Building {
	id: string;
	name: string;
	address: string;
	lat: number;
	lon: number;
	links?: {
		self: string;
		rooms: string;
	};
}

export interface Room {
	id: string;
	buildingId: string;
	roomNumber: string;
	roomType: string;
	furnitureType: string;
	href: string;
	seats: number;
}

/**
 * A course id is the department concatenated with the catalog code, e.g. "cpsc110".
 * Search results only expose dept + code, so this is how we link back to a course page.
 */
export function courseIdOf(dept: string, code: string): string {
	return `${dept}${code}`.toLowerCase();
}

/**
 * Chart series colour. Resolves to a theme CSS variable (--chart-1..5) so charts
 * track light/dark mode automatically. Recharts accepts `var(...)` as a colour.
 */
export function seriesColour(index: number): string {
	return `var(--chart-${(index % 5) + 1})`;
}
