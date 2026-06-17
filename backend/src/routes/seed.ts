// below written by Claude
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { Repositories } from "../App";
import fs from "fs/promises";
import path from "path";
import { Store } from "../storage/types";

export function seedRoutes(repos: Repositories, store: Store): Router {
	const r = Router({ mergeParams: true });

	r.get("/", async (_req, res) => {
		try {
			const seedDir = path.join(process.cwd(), "seed");

			// below by Claude
			const [courseRaw, buildingRaw] = await Promise.all([
				fs.readFile(path.join(seedDir, "course_data.json"), "utf-8"),
				fs.readFile(path.join(seedDir, "building_data.json"), "utf-8"),
			]);
			await Promise.all([
				store.writeCollection("courses", JSON.parse(courseRaw)),
				store.writeCollection("buildings", JSON.parse(buildingRaw)),
			]);
			// above by Claude
			await repos.courses.getCourses();
			await repos.buildings.getBuildings();

			res.status(StatusCodes.OK).json({ message: "Seed data loaded successfully" });
		} catch (err) {
			console.error("Seed error:", err);
			res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to seed data" });
		}
	});

	return r;
}
// above written by Claude
