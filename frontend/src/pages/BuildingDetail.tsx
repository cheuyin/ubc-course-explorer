import { useMemo } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBuilding, useBuildingRooms, useBuildings } from "@/hooks/queries";
import { LoadingState, ErrorState, EmptyState } from "@/components/feedback";
import CampusMap from "@/components/CampusMap";
import StatTile from "@/components/StatTile";

export default function BuildingDetail() {
	const { buildingId } = useParams<{ buildingId: string }>();
	const building = useBuilding(buildingId);
	const rooms = useBuildingRooms(buildingId);
	const buildings = useBuildings();

	const stats = useMemo(() => {
		const list = rooms.data ?? [];
		if (list.length === 0) return null;
		const seats = list.map((r) => r.seats);
		return {
			rooms: list.length,
			totalSeats: seats.reduce((a, s) => a + s, 0),
			maxSeats: Math.max(...seats),
		};
	}, [rooms.data]);

	const sortedRooms = useMemo(() => [...(rooms.data ?? [])].sort((a, b) => b.seats - a.seats), [rooms.data]);

	if (building.isLoading || rooms.isLoading) return <LoadingState label="Loading building…" />;
	if (building.isError) return <ErrorState error={building.error} />;
	if (rooms.isError) return <ErrorState error={rooms.error} />;

	const b = building.data!;

	return (
		<>
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink render={<RouterLink to="/" />}>Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink render={<RouterLink to="/campus" />}>Campus</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{b.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<div className="mb-6">
				<h1 className="text-3xl font-bold tracking-tight">{b.name}</h1>
				<p className="flex items-center gap-1.5 text-muted-foreground">
					<MapPin className="size-4" />
					{b.address}
				</p>
			</div>

			{stats && (
				<div className="mb-6 flex flex-wrap gap-3">
					<StatTile label="Rooms" value={stats.rooms} />
					<StatTile label="Total seats" value={stats.totalSeats} />
					<StatTile label="Largest room" value={`${stats.maxSeats} seats`} />
				</div>
			)}

			<div className="mb-6">
				<CampusMap buildings={buildings.data ?? []} selectedId={b.id} highlightedIds={new Set([b.id])} />
			</div>

			<h2 className="mb-3 text-lg font-semibold">Rooms</h2>
			{sortedRooms.length === 0 ? (
				<EmptyState title="No rooms recorded" hint="This building has no rooms in the dataset." />
			) : (
				<div className="glass max-h-128 overflow-auto rounded-xl">
					<Table>
						<TableHeader className="sticky top-0 z-10 bg-card/80 backdrop-blur">
							<TableRow>
								<TableHead>Room</TableHead>
								<TableHead className="text-right">Seats</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Furniture</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedRooms.map((r) => (
								<TableRow key={r.id}>
									<TableCell>
										{r.href ? (
											<a
												href={r.href}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1 text-primary hover:underline"
											>
												{r.number}
												<ExternalLink className="size-3" />
											</a>
										) : (
											r.number
										)}
									</TableCell>
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
