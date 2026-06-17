import { Router } from "express";
import { Repositories } from "../App";
import { executeSearch } from "../controllers/searchController";

export function searchRoutes(repos: Repositories): Router {
	const r = Router({ mergeParams: true });

	r.post("/", async (req, res) => executeSearch(req, res, repos));

	return r;
}
