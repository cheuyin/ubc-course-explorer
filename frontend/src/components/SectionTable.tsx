import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Section } from "@/types";

export default function SectionTable({ sections }: { sections: Section[] }) {
	const rows = [...sections].sort((a, b) => b.year - a.year || a.instructor.localeCompare(b.instructor));

	return (
		<div className="glass max-h-120 overflow-auto rounded-xl">
			<Table>
				<TableHeader className="sticky top-0 z-10 bg-card/80 backdrop-blur">
					<TableRow>
						<TableHead>Year</TableHead>
						<TableHead>Instructor</TableHead>
						<TableHead className="text-right">Avg</TableHead>
						<TableHead className="text-right">Pass</TableHead>
						<TableHead className="text-right">Fail</TableHead>
						<TableHead className="text-right">Audit</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((s) => (
						<TableRow key={s.id}>
							<TableCell>{s.year === 1900 ? "Overall" : s.year}</TableCell>
							<TableCell>{s.instructor || "—"}</TableCell>
							<TableCell className="text-right">{s.avg}</TableCell>
							<TableCell className="text-right">{s.pass}</TableCell>
							<TableCell className="text-right">{s.fail}</TableCell>
							<TableCell className="text-right">{s.audit}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
