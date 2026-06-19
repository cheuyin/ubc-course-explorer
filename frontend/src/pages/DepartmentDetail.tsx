import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDepartmentCourses } from "@/hooks/queries";
import { LoadingState, ErrorState, EmptyState } from "@/components/feedback";
import StatTile from "@/components/StatTile";
import { courseIdOf } from "@/types";
import type { CourseGroup } from "@/api/search";

function CourseLeaderboard({ title, courses }: { title: string; courses: CourseGroup[] }) {
	return (
		<div className="glass rounded-xl p-5">
			<h2 className="mb-3 text-lg font-semibold">{title}</h2>
			<ul className="space-y-2">
				{courses.map((c) => (
					<li key={`${c.dept}${c.code}`}>
						<RouterLink
							to={`/courses/${courseIdOf(c.dept, c.code)}`}
							className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
						>
							<span className="min-w-0">
								<span className="font-semibold uppercase">
									{c.dept} {c.code}
								</span>{" "}
								<span className="text-sm text-muted-foreground">{c.title}</span>
							</span>
							<span className="shrink-0 tabular-nums font-medium">{c.avg}%</span>
						</RouterLink>
					</li>
				))}
			</ul>
		</div>
	);
}

export default function DepartmentDetail() {
	const { dept } = useParams<{ dept: string }>();
	const navigate = useNavigate();
	const { data, isLoading, isError, error } = useDepartmentCourses(dept);

	const ranked = useMemo(() => [...(data ?? [])].sort((a, b) => b.avg - a.avg), [data]);

	const summary = useMemo(() => {
		const list = data ?? [];
		if (list.length === 0) return null;
		const offerings = list.reduce((a, c) => a + c.offerings, 0);
		const avg = list.reduce((a, c) => a + c.avg, 0) / list.length;
		return { courses: list.length, offerings, avg: avg.toFixed(1) };
	}, [data]);

	if (isLoading) return <LoadingState label="Loading department…" />;
	if (isError) return <ErrorState error={error} />;

	const deptUpper = (dept ?? "").toUpperCase();
	const top = ranked.slice(0, 5);
	const bottom = ranked.slice(-5).reverse();

	return (
		<>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink render={<RouterLink to="/" />}>Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink render={<RouterLink to="/departments" />}>Departments</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{deptUpper}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="mb-6 flex flex-wrap items-start justify-between gap-3">
				<h1 className="text-3xl font-bold uppercase tracking-tight">{deptUpper}</h1>
				<Button variant="outline" render={<RouterLink to={`/search?dept=${encodeURIComponent(dept ?? "")}`} />}>
					Search {deptUpper} courses
					<ArrowUpRight className="size-4" />
				</Button>
			</div>

			{!summary ? (
				<EmptyState title="No courses found" hint="This department has no recorded offerings." />
			) : (
				<>
					<div className="mb-6 flex flex-wrap gap-3">
						<StatTile label="Courses" value={summary.courses} />
						<StatTile label="Offerings" value={summary.offerings} />
						<StatTile label="Avg grade" value={`${summary.avg}%`} />
					</div>

					{ranked.length > 1 && (
						<div className="mb-6 grid gap-4 md:grid-cols-2">
							<CourseLeaderboard title="Highest average" courses={top} />
							<CourseLeaderboard title="Lowest average" courses={bottom} />
						</div>
					)}

					<h2 className="mb-3 text-lg font-semibold">All courses</h2>
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
								{(data ?? []).map((c) => (
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
					</div>
				</>
			)}
		</>
	);
}
