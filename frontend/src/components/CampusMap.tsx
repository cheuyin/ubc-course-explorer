import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Building } from "@/types";

const WIDTH = 800;
const PAD = 28;

/**
 * A lightweight schematic map: building lat/lon projected onto an SVG, no tile
 * layer. Longitude is scaled by cos(lat) so the campus keeps roughly the right
 * proportions at UBC's latitude. Pins navigate to the building detail page.
 */
export default function CampusMap({
	buildings,
	selectedId,
	highlightedIds,
}: {
	buildings: Building[];
	selectedId?: string;
	/** When set, only these buildings render as active; the rest are dimmed. */
	highlightedIds?: Set<string>;
}) {
	const navigate = useNavigate();

	const { points, height } = useMemo(() => {
		if (buildings.length === 0) return { points: [], height: WIDTH * 0.75 };
		const lats = buildings.map((b) => b.lat);
		const lons = buildings.map((b) => b.lon);
		const latMin = Math.min(...lats);
		const latMax = Math.max(...lats);
		const lonMin = Math.min(...lons);
		const lonMax = Math.max(...lons);
		const latRange = latMax - latMin || 1;
		const lonRange = lonMax - lonMin || 1;
		const cosLat = Math.cos(((latMin + latMax) / 2) * (Math.PI / 180));

		// Keep geographic aspect ratio: scale longitude span by cos(lat).
		const aspect = latRange / (lonRange * cosLat);
		const h = (WIDTH - 2 * PAD) * aspect + 2 * PAD;

		const pts = buildings.map((b) => ({
			building: b,
			x: PAD + ((b.lon - lonMin) / lonRange) * (WIDTH - 2 * PAD),
			y: PAD + ((latMax - b.lat) / latRange) * (h - 2 * PAD),
		}));
		return { points: pts, height: h };
	}, [buildings]);

	return (
		<div className="glass overflow-hidden rounded-xl p-2">
			<svg
				viewBox={`0 0 ${WIDTH} ${height}`}
				className="h-auto w-full"
				role="img"
				aria-label="Map of campus buildings"
			>
				{points.map(({ building, x, y }) => {
					const active = !highlightedIds || highlightedIds.has(building.id);
					const selected = building.id === selectedId;
					return (
						<g
							key={building.id}
							transform={`translate(${x} ${y})`}
							className={cn("cursor-pointer", active ? "opacity-100" : "opacity-30")}
							onClick={() => navigate(`/campus/${building.id}`)}
							role="button"
							aria-label={building.name}
						>
							<title>{building.name}</title>
							<circle
								r={selected ? 9 : 6}
								className={cn(
									"transition-all",
									selected ? "fill-primary stroke-primary-foreground" : active ? "fill-primary" : "fill-muted-foreground"
								)}
								strokeWidth={selected ? 2 : 0}
							/>
							<circle r={selected ? 9 : 6} className="fill-transparent hover:fill-primary/20" />
						</g>
					);
				})}
			</svg>
		</div>
	);
}
