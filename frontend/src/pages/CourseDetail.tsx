import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useCourse, useSections } from "@/hooks/queries";
import { LoadingState, ErrorState, EmptyState } from "@/components/feedback";
import GradeTrendChart from "@/components/GradeTrendChart";
import { aggregateByYear } from "@/utils/grades";
import SectionTable from "@/components/SectionTable";
import StatTile from "@/components/StatTile";

export default function CourseDetail() {
	const { courseId } = useParams<{ courseId: string }>();
	const course = useCourse(courseId);
	const sections = useSections(courseId);

	const stats = useMemo(() => {
		const list = sections.data ?? [];
		const real = list.filter((s) => s.year !== 1900);
		if (real.length === 0) return null;
		const totalPass = real.reduce((a, s) => a + s.pass, 0);
		const totalFail = real.reduce((a, s) => a + s.fail, 0);
		const enrolled = totalPass + totalFail;
		const weightedAvg =
			enrolled > 0
				? real.reduce((a, s) => a + s.avg * (s.pass + s.fail), 0) / enrolled
				: real.reduce((a, s) => a + s.avg, 0) / real.length;
		const years = real.map((s) => s.year);
		return {
			avg: weightedAvg.toFixed(1),
			passRate: enrolled > 0 ? ((totalPass / enrolled) * 100).toFixed(1) : "—",
			offerings: real.length,
			range: `${Math.min(...years)}–${Math.max(...years)}`,
		};
	}, [sections.data]);

	const trend = useMemo(() => aggregateByYear(sections.data ?? []), [sections.data]);

	if (course.isLoading || sections.isLoading) return <LoadingState label="Loading course…" />;
	if (course.isError) return <ErrorState error={course.error} />;
	if (sections.isError) return <ErrorState error={sections.error} />;

	const c = course.data!;

	return (
		<>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink render={<RouterLink to="/" />}>Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink render={<RouterLink to={`/search?dept=${c.dept}`} />}>
							{c.dept.toUpperCase()}
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{c.code}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="mb-6 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-3xl font-bold uppercase tracking-tight">
						{c.dept} {c.code}
					</h1>
					<p className="text-lg text-muted-foreground">{c.title}</p>
				</div>
				<Button variant="outline" render={<RouterLink to={`/search?dept=${c.dept}`} />}>
					<ArrowLeft className="size-4" />
					More {c.dept.toUpperCase()} courses
				</Button>
			</div>

			{stats && (
				<div className="mb-6 flex flex-wrap gap-3">
					<StatTile label="Avg grade" value={`${stats.avg}%`} />
					<StatTile label="Pass rate" value={`${stats.passRate}%`} />
					<StatTile label="Offerings" value={stats.offerings} />
					<StatTile label="Years" value={stats.range} />
				</div>
			)}

			<div className="glass mb-6 rounded-xl p-5">
				<h2 className="mb-3 text-lg font-semibold">Average grade over time</h2>
				{trend.length === 0 ? (
					<EmptyState title="No year-by-year data" hint="This course has no dated offerings." />
				) : (
					<GradeTrendChart data={trend} />
				)}
			</div>

			<h2 className="mb-3 text-lg font-semibold">Sections</h2>
			{sections.data && sections.data.length > 0 ? (
				<SectionTable sections={sections.data} />
			) : (
				<EmptyState title="No sections recorded" />
			)}
		</>
	);
}
