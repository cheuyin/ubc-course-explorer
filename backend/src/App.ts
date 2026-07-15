import fs from "fs/promises";
import path from "path";
import express from "express";
import cors from "cors";
import { CourseSectionRepository } from "./repositories/courseSectionRepository";
import { BuildingRoomRepository } from "./repositories/buildingRoomRepository";
import { courseRoutes } from "./routes/courses";
import { sectionRoutes } from "./routes/sections";
import { searchRoutes } from "./routes/search";
import { uploadRoutesV1 } from "./routes/v1/uploadV1";
import { uploadRoutes } from "./routes/upload";
import { buildingRoutes } from "./routes/buildings";
import { roomRoutes } from "./routes/rooms";
import { searchRoutesV1 } from "./routes/v1/searchV1";
import { seedRoutes } from "./routes/seed";
import { createFileStore } from "./storage/fileStore";

export interface Repositories {
	courses: CourseSectionRepository;
	buildings: BuildingRoomRepository;
}

/**
 * Express application.
 */
export type Application = ReturnType<typeof express>;

/**
 * Configuration options for the application.
 */
export type AppConfig = {
	/**
	 * The directory where application data will be stored enabling the application to persist data between restarts.
	 *
	 * @internal
	 * During autograding, the directory will be deleted as a means to reset the application data between tests.
	 */
	readonly datadir: string;
};

/**
 * Initializes the application.
 */
export async function createApp(config: AppConfig): Promise<Application> {
	const app = express();
	const staticDir = path.resolve(process.cwd(), "../frontend/public");
	const indexFile = path.join(staticDir, "index.html");

	const store = createFileStore(config.datadir);

	const repos: Repositories = {
		courses: new CourseSectionRepository(store),
		buildings: new BuildingRoomRepository(store),
	};

	await fs.mkdir(config.datadir, { recursive: true });
	app.use(express.static(staticDir));
	app.use(express.json());
	app.use(express.raw({ type: "application/*", limit: "10mb" }));
	app.use(cors());

	// == DEPRECATED ==
	app.use("/api/v1/datasets", uploadRoutesV1(repos.courses));
	app.use("/api/v1/search", searchRoutesV1(repos.courses));
	// ================

	app.use("/api/v1/courses", courseRoutes(repos.courses));
	app.use("/api/v1/courses/:courseId/sections", sectionRoutes(repos.courses));
	app.use("/api/v2/datasets", uploadRoutes(repos));
	app.use("/api/v2/buildings", buildingRoutes(repos.buildings));
	app.use("/api/v2/buildings/:buildingId/rooms", roomRoutes(repos.buildings));
	app.use("/api/v2/search", searchRoutes(repos));
	app.use("/api/v2/seed", seedRoutes(repos, store));

	app.get("/api", (req, res) => {
		res.send("App is running!");
	});

	app.use((req, res, next) => {
		if (req.method !== "GET" || req.path.startsWith("/api")) {
			next();
			return;
		}

		res.sendFile(indexFile);
	});

	return app;
}
