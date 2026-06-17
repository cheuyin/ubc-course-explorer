// entire file written with copilot assistance

import { Router } from "express";
import { CourseSectionRepository } from "../repositories/courseSectionRepository";
import { listSections, listSection, deleteSection, createSection } from "../controllers/sectionControllers";

export function sectionRoutes(repo: CourseSectionRepository): Router {
	const r = Router({ mergeParams: true });

	r.get("/", async (req, res) => listSections(req, res, repo));
	r.get("/:sectionId", async (req, res) => listSection(req, res, repo));
	r.put("/:sectionId", async (req, res) => createSection(req, res, repo));
	r.delete("/:sectionId", async (req, res) => deleteSection(req, res, repo));

	return r;
}

// code above written with copilot assistance
