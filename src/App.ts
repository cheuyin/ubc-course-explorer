import fs from "fs/promises";
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
import { seedRoutes } from "./routes/seed"; // below written by Claude
import { createFileStore } from "./storage/fileStore";

// below by Claude
export interface Repositories {
	courses: CourseSectionRepository;
	buildings: BuildingRoomRepository;
}
// above by Claude

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
// refactored with copilot to match lint requirements (35 lines or less for a function)
export async function createApp(config: AppConfig): Promise<Application> {
	const app = express();

	const store = createFileStore(config.datadir);

	const repos: Repositories = {
		courses: new CourseSectionRepository(store),
		buildings: new BuildingRoomRepository(store),
	};

	await fs.mkdir(config.datadir, { recursive: true });
	app.use(express.static("frontend/public"));
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
	app.use("/api/v2/seed", seedRoutes(repos, store)); // written by Claude

	app.get("/api", (req, res) => {
		res.send("App is running!");
	});

	return app;
}
