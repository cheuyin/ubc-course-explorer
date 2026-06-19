import { useMemo } from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useInstructorOfferings } from "@/hooks/queries";
import { groupOfferingsByCourse } from "@/api/search";
import { LoadingState, ErrorState, EmptyState } from "@/components/feedback";
import GradeTrendChart from "@/components/GradeTrendChart";
import { aggregateByYear } from "@/utils/grades";
import StatTile from "@/components/StatTile";
import { courseIdOf } from "@/types";

/** "smulders, dave" -> "Dave Smulders" for display; the raw name stays in the URL. */
function displayName(name: string): string {
	const [last, first] = name.split(",").map((s) => s.trim());
	const cased = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());
	return first ? `${cased(first)} ${cased(last)}` : cased(name);
}

export default function InstructorDetail() {
	const { name } = useParams<{ name: string }>();
	const navigate = useNavigate();
	const { data, isLoading, isError, error } = useInstructorOfferings(name);

	const courses = useMemo(() => groupOfferingsByCourse(data ?? []), [data]);
	const trend = useMemo(() => aggregateByYear(data ?? []), [data]);

	const summary = useMemo(() => {
		const list = data ?? [];
		const real = list.filter((s) => s.year !== 1900);
		if (real.length === 0) return null;
		const avg = real.reduce((a, s) => a + s.avg, 0) / real.length;
		const years = real.map((s) => s.year);
		return {
			courses: courses.length,
			offerings: real.length,
			avg: avg.toFixed(1),
			range: `${Math.min(...years)}–${Math.max(...years)}`,
		};
	}, [data, courses.length]);

	if (isLoading) return <LoadingState label="Loading instructor…" />;
	if (isError) return <ErrorState error={error} />;

	const label = displayName(name ?? "");

	return (
		<>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink render={<RouterLink to="/" />}>Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{label}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<h1 className="mb-6 text-3xl font-bold tracking-tight">{label}</h1>

			{!summary ? (
				<EmptyState title="No offerings found" hint="No recorded sections for this instructor." />
			) : (
				<>
					<div className="mb-6 flex flex-wrap gap-3">
						<StatTile label="Courses taught" value={summary.courses} />
						<StatTile label="Offerings" value={summary.offerings} />
						<StatTile label="Avg grade" value={`${summary.avg}%`} />
						<StatTile label="Years" value={summary.range} />
					</div>

					<div className="glass mb-6 rounded-xl p-5">
						<h2 className="mb-3 text-lg font-semibold">Average grade over time</h2>
						{trend.length === 0 ? (
							<EmptyState title="No year-by-year data" hint="This instructor has no dated offerings." />
						) : (
							<GradeTrendChart data={trend} />
						)}
					</div>

					<h2 className="mb-3 text-lg font-semibold">Courses taught</h2>
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
								{courses.map((c) => (
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
