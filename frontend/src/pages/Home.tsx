import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/hooks/queries";
import { LoadingState, ErrorState } from "@/components/feedback";

function Hero() {
	const [q, setQ] = useState("");
	const navigate = useNavigate();
	return (
		<div className="glass relative mb-8 overflow-hidden rounded-2xl p-8 text-center md:p-12">
			<div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/20 via-transparent to-chart-4/15" />
			<div className="relative">
				<h1 className="mb-2 text-3xl font-bold tracking-tight md:text-4xl">
					Explore UBC courses by their grade history
				</h1>
				<p className="mb-6 text-muted-foreground">
					Search thousands of course offerings from 2007 to 2016 to see historical averages, instructors, and pass
					rates.
				</p>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
					}}
					className="relative mx-auto flex max-w-xl items-center gap-2"
				>
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							autoFocus
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Try “cpsc”, “computation”, or an instructor name"
							className="h-11 bg-background/70 pl-9"
						/>
					</div>
					<Button type="submit" size="lg">
						Search
					</Button>
				</form>
			</div>
		</div>
	);
}

export default function Home() {
	const { data, isLoading, isError, error } = useDepartments();
	const [filter, setFilter] = useState("");

	const departments = useMemo(() => {
		const list = data ?? [];
		const f = filter.trim().toLowerCase();
		return f ? list.filter((d) => d.dept.toLowerCase().includes(f)) : list;
	}, [data, filter]);

	return (
		<>
			<Hero />

			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-xl font-semibold tracking-tight">Browse by department</h2>
				<div className="relative">
					<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
						placeholder="Filter departments"
						className="w-56 pl-9"
					/>
				</div>
			</div>

			{isLoading && <LoadingState label="Loading departments…" />}
			{isError && <ErrorState error={error} />}

			{data && (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
					{departments.map((d) => (
						<RouterLink
							key={d.dept}
							to={`/search?dept=${encodeURIComponent(d.dept)}`}
							className="glass rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
						>
							<div className="text-lg font-semibold uppercase">{d.dept}</div>
							<div className="text-sm text-muted-foreground">{d.courseCount} courses</div>
						</RouterLink>
					))}
				</div>
			)}
		</>
	);
}
