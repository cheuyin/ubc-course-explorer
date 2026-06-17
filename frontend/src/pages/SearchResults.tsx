import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCourseSearch } from "@/hooks/queries";
import type { CourseSearchFilters, CourseRow } from "@/api/search";
import { courseIdOf } from "@/types";
import { LoadingState, ErrorState, EmptyState } from "@/components/feedback";

interface CourseGroup {
	dept: string;
	code: string;
	title: string;
	offerings: number;
	avg: number;
	latestYear: number;
}

/** Collapse section rows into one entry per distinct course. */
function groupByCourse(rows: CourseRow[]): CourseGroup[] {
	const map = new Map<string, { dept: string; code: string; title: string; sumAvg: number; n: number; latestYear: number }>();
	for (const r of rows) {
		const key = `${r.dept}${r.code}`;
		const cur = map.get(key);
		if (cur) {
			cur.sumAvg += r.avg;
			cur.n += 1;
			cur.latestYear = Math.max(cur.latestYear, r.year);
		} else {
			map.set(key, { dept: r.dept, code: r.code, title: r.title, sumAvg: r.avg, n: 1, latestYear: r.year });
		}
	}
	return [...map.values()]
		.map((g) => ({
			dept: g.dept,
			code: g.code,
			title: g.title,
			offerings: g.n,
			avg: Number((g.sumAvg / g.n).toFixed(2)),
			latestYear: g.latestYear,
		}))
		.sort((a, b) => a.dept.localeCompare(b.dept) || a.code.localeCompare(b.code));
}

// Read the editable filter fields out of the URL.
function paramsToFilters(sp: URLSearchParams): CourseSearchFilters {
	const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
	return {
		q: sp.get("q") || undefined,
		dept: sp.get("dept") || undefined,
		code: sp.get("code") || undefined,
		instructor: sp.get("instructor") || undefined,
		minAvg: num("minAvg"),
		yearStart: num("yearStart"),
		yearEnd: num("yearEnd"),
	};
}

const TEXT_KEYS = new Set<keyof CourseSearchFilters>(["q", "dept", "code", "instructor"]);

// Remounted via `key` whenever applied filters change, so draft re-initializes
// from props without a synchronizing effect.
function FilterPanel({ filters, onApply }: { filters: CourseSearchFilters; onApply: (f: CourseSearchFilters) => void }) {
	const [draft, setDraft] = useState(filters);

	const set = (k: keyof CourseSearchFilters) => (e: React.ChangeEvent<HTMLInputElement>) =>
		setDraft((d) => ({
			...d,
			[k]: e.target.value === "" ? undefined : TEXT_KEYS.has(k) ? e.target.value : Number(e.target.value),
		}));

	const field = (k: keyof CourseSearchFilters, label: string, type = "text") => (
		<div className="space-y-1.5">
			<Label htmlFor={k} className="text-xs">
				{label}
			</Label>
			<Input id={k} type={type} value={(draft[k] as string | number | undefined) ?? ""} onChange={set(k)} />
		</div>
	);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onApply(draft);
			}}
			className="glass mb-6 grid grid-cols-2 gap-3 rounded-xl p-4 md:grid-cols-4 lg:grid-cols-8"
		>
			<div className="col-span-2">{field("q", "Keyword")}</div>
			{field("dept", "Dept")}
			{field("code", "Code")}
			<div className="col-span-2">{field("instructor", "Instructor")}</div>
			{field("minAvg", "Min avg", "number")}
			{field("yearStart", "Year from", "number")}
			{field("yearEnd", "Year to", "number")}
			<div className="col-span-2 flex items-end">
				<Button type="submit" className="w-full">
					Search
				</Button>
			</div>
		</form>
	);
}

const PAGE_SIZE = 25;

export default function SearchResults() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const filters = useMemo(() => paramsToFilters(searchParams), [searchParams]);

	// An empty WHERE matches every section (>5000), which the backend rejects.
	// Only run a search once at least one filter is set.
	const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "");
	const { data, isLoading, isError, error, isFetching } = useCourseSearch(filters, "dept", hasFilters);
	const courses = useMemo(() => groupByCourse(data ?? []), [data]);

	const [page, setPage] = useState(0);

	const applyFilters = (f: CourseSearchFilters) => {
		const next = new URLSearchParams();
		Object.entries(f).forEach(([k, v]) => {
			if (v !== undefined && v !== "" && !Number.isNaN(v as number)) next.set(k, String(v));
		});
		setPage(0);
		setSearchParams(next);
	};

	// Clamp the page in case the result set shrank, instead of resetting via an effect.
	const pageCount = Math.max(1, Math.ceil(courses.length / PAGE_SIZE));
	const safePage = Math.min(page, pageCount - 1);
	const paged = courses.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

	return (
		<>
			<h1 className="mb-4 text-2xl font-bold tracking-tight">Course search</h1>
			<FilterPanel key={searchParams.toString()} filters={filters} onApply={applyFilters} />

			{!hasFilters && (
				<EmptyState
					title="Search for courses"
					hint="Enter a keyword, department, code, or instructor above to begin."
				/>
			)}
			{isLoading && <LoadingState label="Searching…" />}
			{isError && <ErrorState error={error} />}

			{data && (
				<>
					<div className="mb-2 flex items-center gap-2">
						<p className="text-sm text-muted-foreground">
							{courses.length} courses · {data.length} offerings
						</p>
						{isFetching && <Badge variant="secondary">Updating…</Badge>}
					</div>

					{courses.length === 0 ? (
						<EmptyState title="No courses found" hint="Try a broader keyword or remove some filters." />
					) : (
						<div className="glass overflow-hidden rounded-xl">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Course</TableHead>
										<TableHead>Title</TableHead>
										<TableHead className="text-right">Avg</TableHead>
										<TableHead className="text-right">Offerings</TableHead>
										<TableHead className="text-right">Latest</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paged.map((c) => (
										<TableRow
											key={`${c.dept}${c.code}`}
											className="cursor-pointer"
											onClick={() => navigate(`/courses/${courseIdOf(c.dept, c.code)}`)}
										>
											<TableCell className="whitespace-nowrap font-semibold uppercase">
												{c.dept} {c.code}
											</TableCell>
											<TableCell>{c.title}</TableCell>
											<TableCell className="text-right">{c.avg}%</TableCell>
											<TableCell className="text-right">{c.offerings}</TableCell>
											<TableCell className="text-right">{c.latestYear === 1900 ? "—" : c.latestYear}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>

							<div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
								<span className="text-sm text-muted-foreground">
									Page {safePage + 1} of {pageCount}
								</span>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={safePage === 0}
										onClick={() => setPage((p) => Math.max(0, p - 1))}
									>
										Previous
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={safePage >= pageCount - 1}
										onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
									>
										Next
									</Button>
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</>
	);
}
