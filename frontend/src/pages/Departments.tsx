import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDepartments } from "@/hooks/queries";
import { LoadingState, ErrorState } from "@/components/feedback";

export default function Departments() {
	const { data, isLoading, isError, error } = useDepartments();
	const navigate = useNavigate();

	if (isLoading) return <LoadingState label="Loading departments…" />;
	if (isError) return <ErrorState error={error} />;

	const rows = [...(data ?? [])].sort((a, b) => b.courseCount - a.courseCount);

	return (
		<>
			<h1 className="mb-4 text-2xl font-bold tracking-tight">Departments</h1>
			<div className="glass overflow-hidden rounded-xl">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Department</TableHead>
							<TableHead className="text-right">Courses</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((d) => (
							<TableRow
								key={d.dept}
								className="cursor-pointer"
								onClick={() => navigate(`/search?dept=${encodeURIComponent(d.dept)}`)}
							>
								<TableCell className="font-semibold uppercase">{d.dept}</TableCell>
								<TableCell className="text-right">{d.courseCount}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</>
	);
}
