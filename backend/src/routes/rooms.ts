import { Router } from "express";
import { BuildingRoomRepository } from "../repositories/buildingRoomRepository";
import { createRoom, deleteRoom, listRoom, listRooms } from "../controllers/roomControllers";
import { validateBuildingId, validateRoomId, validateQuery, validateRoomBody } from "../middleware/validation";
import { handleErrors } from "../middleware/handleErrors";

export function roomRoutes(repo: BuildingRoomRepository): Router {
	const r = Router({ mergeParams: true });

	r.get("/", validateQuery, listRooms(repo));
	r.get("/:roomId", validateBuildingId(repo), validateRoomId(repo), listRoom(repo));
	r.put("/:roomId", validateBuildingId(repo), validateRoomBody, createRoom(repo));
	r.delete("/:roomId", validateBuildingId(repo), validateRoomId(repo), deleteRoom(repo));

	r.use(handleErrors);
	return r;
}
