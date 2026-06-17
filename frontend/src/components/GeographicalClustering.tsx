import { useRef } from "react";
import { Paper, Typography } from "@mui/material";
import api from "../api/axios";
import React, { useEffect } from "react";
import { Map, View, Feature } from "ol";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj.js";
import type { Coordinate } from "ol/coordinate";
import type { Building } from "../types";

// https://dev.to/marina_eremina/how-to-add-a-map-with-a-location-to-a-webpage-using-openlayers-and-react-gnc was used as a guide for implementing OSM layer and vector layer as well as OpenLayer docs - https://openlayers.org/en/latest/apidoc/


function createPoints(buildings: Building[], geo: Feature<Point>[]) {
	for (let i = 0; i < buildings.length; i++) {
		const lat = buildings[i].lat;
		const lon = buildings[i].lon;
		const name = buildings[i].name;
		const id = buildings[i].id;
        const self = buildings[i].links.self;
        const rooms = buildings[i].links.rooms;
		const coordinates: Coordinate = fromLonLat([lon, lat]);
		const building: Feature<Point> = new Feature({ geometry: new Point(coordinates) });
		building.set("name", name);
		building.setId(id);
        building.set("self", self);
        building.set("rooms", rooms);
		geo.push(building);
	}
}

async function getBuildings(): Promise<Feature<Point>[]> {
	const res = await api.get("/v2/buildings");
	const buildings = res.data.items;
	const geo: Feature<Point>[] = [];
	createPoints(buildings, geo);
	return geo;
}

const ubcCoords = [-123.2456, 49.2662];
const centreCoords: Coordinate = fromLonLat(ubcCoords);

const MAP = "map" as const;
// debugged below code w/ copilot and used copilot to generate tooltip func
const MapPlot: React.FC = () => {
	const tooltipRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let map: Map | undefined;

		getBuildings().then((data) => {
			const pointsLayer = new VectorLayer({
				source: new VectorSource({
					features: data,
				}),
			});

			const OSMLayer = new TileLayer({
				source: new OSM(),
			});

			map = new Map({
				target: MAP,
				view: new View({
					center: centreCoords,
					zoom: 15,
				}),
				layers: [OSMLayer, pointsLayer],
			});

			map.on("pointermove", (evt) => {
				const tooltip = tooltipRef.current;
				if (!tooltip) return;

				const feature = map!.forEachFeatureAtPixel(evt.pixel, (f) => f);

				if (feature) {
					tooltip.style.display = "block";
					tooltip.style.left = evt.pixel[0] + 10 + "px";
					tooltip.style.top = evt.pixel[1] + 10 + "px";
					tooltip.innerHTML = feature.get("name");
				} else {
					tooltip.style.display = "none";
				}
			});
		});

		return () => map?.setTarget(undefined);
	}, []);

	return (
		<Paper sx={{ p: 3, mb: 3 }} elevation={2}>
			<Typography variant="h6" align="center">
                Geographical clustering of buildings at UBC
            </Typography>
			<div style={{ position: "relative" }}>
				<div id={MAP} style={{ width: "100%", height: "750px" }}></div>

				<div
					ref={tooltipRef}
					style={{
						position: "absolute",
						background: "white",
						padding: "4px 8px",
						borderRadius: "4px",
						border: "1px solid #ccc",
						pointerEvents: "none",
						display: "none",
						zIndex: 1000,
					}}
				></div>
			</div>

			<div className="attribution">
				© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
			</div>
		</Paper>
	);
};
// above debugged with copilot
export default MapPlot;
