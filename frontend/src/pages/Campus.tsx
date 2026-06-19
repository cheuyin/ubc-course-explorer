import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBuildings, useRooms } from "@/hooks/queries";
import { LoadingState, ErrorState, EmptyState } from "@/components/feedback";
import CampusMap from "@/components/CampusMap";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
	"h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Distinct, sorted, non-empty values of a field across all rooms. */
function distinct(rooms: { [k: string]: string | number }[], key: string): string[] {
	return [...new Set(rooms.map((r) => String(r[key])).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export default function Campus() {
	const buildings = useBuildings();
	const rooms = useRooms();

	const [minSeats, setMinSeats] = useState("");
	const [furniture, setFurniture] = useState("");
	const [type, setType] = useState("");

	const all = useMemo(() => rooms.data ?? [], [rooms.data]);
	const furnitureOptions = useMemo(() => distinct(all, "furniture"), [all]);
	const typeOptions = useMemo(() => distinct(all, "type"), [all]);

	const filtered = useMemo(() => {
		const min = minSeats ? Number(minSeats) : 0;
		return all.filter(
			(r) =>
				r.seats >= min &&
				(!furniture || r.furniture === furniture) &&
				(!type || r.type === type)
		);
	}, [all, minSeats, furniture, type]);

	const matchingBuildings = useMemo(() => new Set(filtered.map((r) => String(r.building))), [filtered]);
	const hasFilters = minSeats !== "" || furniture !== "" || type !== "";

	if (buildings.isLoading || rooms.isLoading) return <LoadingState label="Loading campus…" />;
	if (buildings.isError) return <ErrorState error={buildings.error} />;
	if (rooms.isError) return <ErrorState error={rooms.error} />;

	return (
		<>
			<h1 className="mb-4 text-2xl font-bold tracking-tight">Campus rooms</h1>

			<form className="glass mb-6 grid grid-cols-2 gap-3 rounded-xl p-4 md:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
				<div className="space-y-1.5">
					<Label htmlFor="minSeats" className="text-xs">
						Min seats
					</Label>
					<Input
						id="minSeats"
						type="number"
						min={0}
						value={minSeats}
						onChange={(e) => setMinSeats(e.target.value)}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="furniture" className="text-xs">
						Furniture
					</Label>
					<select id="furniture" className={SELECT_CLASS} value={furniture} onChange={(e) => setFurniture(e.target.value)}>
						<option value="">Any</option>
						{furnitureOptions.map((f) => (
							<option key={f} value={f}>
								{f}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="type" className="text-xs">
						Room type
					</Label>
					<select id="type" className={SELECT_CLASS} value={type} onChange={(e) => setType(e.target.value)}>
						<option value="">Any</option>
						{typeOptions.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</div>
				<div className="flex items-end">
					<Button
						type="button"
						variant="outline"
						className="w-full"
						disabled={!hasFilters}
						onClick={() => {
							setMinSeats("");
							setFurniture("");
							setType("");
						}}
					>
						Reset
					</Button>
				</div>
			</form>

			<div className="mb-6">
				<CampusMap buildings={buildings.data ?? []} highlightedIds={hasFilters ? matchingBuildings : undefined} />
				<p className="mt-2 text-center text-xs text-muted-foreground">
					{hasFilters
						? `${matchingBuildings.size} buildings with matching rooms — click a pin to explore`
						: "Click a pin to explore a building"}
				</p>
			</div>

			<p className="mb-2 text-sm text-muted-foreground">{filtered.length} rooms</p>
			{filtered.length === 0 ? (
				<EmptyState title="No rooms match" hint="Try lowering the seat minimum or clearing filters." />
			) : (
				<div className="glass max-h-128 overflow-auto rounded-xl">
					<Table>
						<TableHeader className="sticky top-0 z-10 bg-card/80 backdrop-blur">
							<TableRow>
								<TableHead>Building</TableHead>
								<TableHead>Room</TableHead>
								<TableHead className="text-right">Seats</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Furniture</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.map((r) => (
								<TableRow key={`${r.building}-${r.number}`}>
									<TableCell>
										<RouterLink
											to={`/campus/${r.building}`}
											className={cn("font-medium text-primary hover:underline")}
										>
											{r.name}
										</RouterLink>
									</TableCell>
									<TableCell>{r.number}</TableCell>
									<TableCell className="text-right tabular-nums">{r.seats}</TableCell>
									<TableCell>{r.type || "—"}</TableCell>
									<TableCell className="text-muted-foreground">{r.furniture || "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</>
	);
}
