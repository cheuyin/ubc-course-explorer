import { Router } from "express";
import { CourseSectionRepository } from "../../repositories/courseSectionRepository";
import { executeSearch } from "../../controllers/v1/searchControllerV1";

export function searchRoutesV1(repo: CourseSectionRepository): Router {
	const r = Router({ mergeParams: true });

	r.post("/", async (req, res) => executeSearch(req, res, repo));

	return r;
}
