import { Router } from "express";
import { CourseSectionRepository } from "../repositories/courseSectionRepository";
import { createCourse, deleteCourse, listCourse, listCourses } from "../controllers/courseControllers";

export function courseRoutes(repo: CourseSectionRepository): Router {
	const r = Router({ mergeParams: true });

	r.get("/", async (req, res) => listCourses(req, res, repo));
	r.get("/:courseId", async (req, res) => listCourse(req, res, repo));
	r.put("/:courseId", async (req, res) => createCourse(req, res, repo));
	r.delete("/:courseId", async (req, res) => deleteCourse(req, res, repo));

	return r;
}
