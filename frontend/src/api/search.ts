import api from "./axios";

// ===== Search DSL types (POST /api/v2/search) =====
// The backend returns a flat array of objects projected to the requested COLUMNS.

export type SearchKind = "course_offerings" | "facilities";

export type Filter =
	| { IS: Record<string, string> }
	| { EQ: Record<string, number> }
	| { GT: Record<string, number> }
	| { LT: Record<string, number> }
	| { AND: Filter[] }
	| { OR: Filter[] }
	| { NOT: Filter }
	| Record<string, never>; // {} matches everything

export type Order = string | { dir: "UP" | "DOWN"; keys: string[] };

export interface ApplyRule {
	[applyKey: string]: { MAX?: string; MIN?: string; AVG?: string; COUNT?: string; SUM?: string };
}

export interface SearchQuery {
	WHERE: Filter;
	OPTIONS: { COLUMNS: string[]; ORDER?: Order };
	TRANSFORMATIONS?: { GROUP: string[]; APPLY: ApplyRule[] };
}

export interface SearchRequest {
	kind: SearchKind;
	query: SearchQuery;
}

export type SearchRow = Record<string, string | number>;

/** Run a raw search query. Returns the flat result rows. */
export async function search<T extends SearchRow = SearchRow>(req: SearchRequest): Promise<T[]> {
	const res = await api.post("/v2/search", req);
	return res.data as T[];
}

// ===== WHERE builder =====
// Combines an array of leaf filters into a single AND, mirroring the pattern
// previously inlined in DataExplorer.

export function and(filters: Filter[]): Filter {
	const nonEmpty = filters.filter((f) => Object.keys(f).length > 0);
	if (nonEmpty.length === 0) return {};
	if (nonEmpty.length === 1) return nonEmpty[0];
	return { AND: nonEmpty };
}

export function or(filters: Filter[]): Filter {
	if (filters.length === 0) return {};
	if (filters.length === 1) return filters[0];
	return { OR: filters };
}

/** Case-insensitive "contains" match on a string field via IS with wildcards. */
export function contains(field: string, value: string): Filter {
	return { IS: { [field]: `*${value.toLowerCase()}*` } };
}

export function equals(field: string, value: string): Filter {
	return { IS: { [field]: value.toLowerCase() } };
}

// ===== Course-offerings result rows =====

export interface CourseRow extends SearchRow {
	dept: string;
	code: string;
	title: string;
	year: number;
	instructor: string;
	avg: number;
}

export interface CourseSearchFilters {
	/** Free-text query, matched across dept, title and instructor. */
	q?: string;
	dept?: string;
	code?: string;
	instructor?: string;
	title?: string;
	minAvg?: number;
	yearStart?: number;
	yearEnd?: number;
}

export function buildCourseWhere(f: CourseSearchFilters): Filter {
	const leaves: Filter[] = [];
	if (f.q?.trim()) {
		const term = f.q.trim();
		leaves.push(or([contains("dept", term), contains("title", term), contains("instructor", term)]));
	}
	if (f.dept?.trim()) leaves.push(equals("dept", f.dept.trim()));
	if (f.code?.trim()) leaves.push(contains("code", f.code.trim()));
	if (f.instructor?.trim()) leaves.push(contains("instructor", f.instructor.trim()));
	if (f.title?.trim()) leaves.push(contains("title", f.title.trim()));
	if (typeof f.minAvg === "number" && !Number.isNaN(f.minAvg)) leaves.push({ GT: { avg: f.minAvg - 0.0001 } });
	if (typeof f.yearStart === "number" && !Number.isNaN(f.yearStart)) leaves.push({ GT: { year: f.yearStart - 1 } });
	if (typeof f.yearEnd === "number" && !Number.isNaN(f.yearEnd)) leaves.push({ LT: { year: f.yearEnd + 1 } });
	return and(leaves);
}

/** Search course offerings (one row per section). */
export function searchCourseOfferings(f: CourseSearchFilters, order: Order = "dept"): Promise<CourseRow[]> {
	return search<CourseRow>({
		kind: "course_offerings",
		query: {
			WHERE: buildCourseWhere(f),
			OPTIONS: { COLUMNS: ["dept", "code", "title", "year", "instructor", "avg"], ORDER: order },
		},
	});
}

// ===== Departments =====

export interface DeptRow {
	dept: string;
	courseCount: number;
}

/**
 * Distinct departments with their course counts.
 *
 * Derived from the (paginated) courses list rather than a GROUP search: the
 * search endpoint caps *matched sections* at 5000 before transformations run,
 * so an unfiltered department aggregation always exceeds the cap. The courses
 * list (one row per course, ~3.6k total) stays well under it.
 */
export async function fetchDepartments(): Promise<DeptRow[]> {
	const res = await api.get("/v1/courses", { params: { limit: 5000 } });
	const items = res.data.items as { dept: string }[];
	const counts = new Map<string, number>();
	for (const c of items) counts.set(c.dept, (counts.get(c.dept) ?? 0) + 1);
	return [...counts.entries()]
		.map(([dept, courseCount]) => ({ dept, courseCount }))
		.sort((a, b) => a.dept.localeCompare(b.dept));
}

// ===== Facilities (rooms) =====

export interface RoomRow extends SearchRow {
	building: string;
	name: string;
	address: string;
	number: string;
	seats: number;
	furniture: string;
	type: string;
}

export interface RoomSearchFilters {
	minSeats?: number;
	furniture?: string;
	type?: string;
}

export function searchRooms(f: RoomSearchFilters): Promise<RoomRow[]> {
	const leaves: Filter[] = [];
	if (typeof f.minSeats === "number" && !Number.isNaN(f.minSeats)) leaves.push({ GT: { seats: f.minSeats - 1 } });
	if (f.furniture?.trim()) leaves.push(contains("furniture", f.furniture.trim()));
	if (f.type?.trim()) leaves.push(contains("type", f.type.trim()));
	return search<RoomRow>({
		kind: "facilities",
		query: {
			WHERE: and(leaves),
			OPTIONS: {
				COLUMNS: ["building", "name", "address", "number", "seats", "furniture", "type"],
				ORDER: { dir: "DOWN", keys: ["seats"] },
			},
		},
	});
}
