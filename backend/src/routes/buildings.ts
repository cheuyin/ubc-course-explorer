import { Router } from "express";
import { BuildingRoomRepository } from "../repositories/buildingRoomRepository";
import { createBuilding, deleteBuilding, listBuilding, listBuildings } from "../controllers/buildingControllers";
import { handleErrors } from "../middleware/handleErrors";
import { validateBuildingBody, validateBuildingId, validateQuery } from "../middleware/validation";

export function buildingRoutes(repo: BuildingRoomRepository): Router {
	const r = Router({ mergeParams: true });

	r.get("/", validateQuery, listBuildings(repo));
	r.put("/:buildingId", validateBuildingBody, createBuilding(repo));
	r.get("/:buildingId", validateBuildingId(repo), listBuilding(repo));
	r.delete("/:buildingId", validateBuildingId(repo), deleteBuilding(repo));

	r.use(handleErrors);
	return r;
}
