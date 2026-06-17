import { StatusCodes } from "http-status-codes";
import { CourseSectionRepository } from "../repositories/courseSectionRepository";
import { Course } from "../models/course";
import { type Request, type Response } from "express";

// code below written with Gemini
export function sendNotFound(res: Response, id: string, obj: string): void {
	res.status(StatusCodes.NOT_FOUND).send({
		error: "Not found",
		message: "no " + obj + " with id '" + id + "'",
	});
}
// code above written with Gemini

export function validateQuery(limit: number, offset: number, errors: any): any {
	const max = 5000;
	if (!Number.isInteger(limit) || Number.isNaN(limit) || limit < 1 || limit > max) {
		errors.params = {
			...errors.params,
			limit: "expected an integer between 1 and 5000",
		};
	}
	if (!Number.isInteger(offset) || Number.isNaN(offset) || offset < 0) {
		errors.params = {
			...errors.params,
			offset: "expected an integer >= 0",
		};
	}
	return Object.keys(errors.params).length > 0 ? errors : null;
}

export async function listCourses(req: Request, res: Response, repo: CourseSectionRepository): Promise<void> {
	const courses = await repo.getCourses();

	// code below based off sample implementation given in C1 assignment info - https://canvas.ubc.ca/courses/176257/assignments/2334739
	// Extract pagination parameters from query string
	// URL: /courses?limit=100&offset=200

	const errors = {
		error: "Invalid request parameters",
		params: {},
	};

	// below code written with Copilot

	const limit = req.query.limit ? Number(req.query.limit as string) : 100;
	const offset = req.query.offset ? Number(req.query.offset as string) : 0;

	// above code written with Copilot

	if (validateQuery(limit, offset, errors)) {
		res.status(StatusCodes.BAD_REQUEST).send(errors);
		return;
	}
	// Apply pagination to your results array
	const paginatedResults = courses.slice(offset, offset + limit);
	// code above based on - https://canvas.ubc.ca/courses/176257/assignments/2334739

	const body = {
		total: courses.length,
		limit: limit,
		offset: offset,
		items: paginatedResults.map((course) => {
			return {
				id: course.id,
				title: course.title,
				dept: course.dept,
				code: course.code,
				links: {
					self: `${req.originalUrl}`.split("?")[0] + `/${course.id}`,
					sections: `${req.originalUrl}`.split("?")[0] + `/${course.id}/sections`,
				},
			};
		}),
	};
	res.status(StatusCodes.OK).send(body);
}
// written with Gemini below
function validateCourseBody(req: Request, fields: any): any {
	["title", "dept", "code"].forEach((key) => {
		if (!(key in req.body)) {
			fields[key] = "required but missing";
		} else if (typeof req.body[key] !== "string") {
			fields[key] = "expected a string";
		}
	});
	return Object.keys(fields).length > 0 ? fields : null;
}

function formatCourseResponse(course: Course, url: string): {} {
	return {
		id: course.id,
		title: course.title,
		dept: course.dept,
		code: course.code,
		links: {
			self: url,
			sections: url + "/sections",
		},
	};
}
// written with Gemini above

export async function createCourse(req: Request, res: Response, repo: CourseSectionRepository): Promise<void> {
	const errors = {
		error: "Validation failed",
		fields: {},
	};

	if (validateCourseBody(req, errors.fields)) {
		res.status(StatusCodes.UNPROCESSABLE_ENTITY).send(errors);
		return;
	}

	const course = await repo.getCourseByIdAsync(req.params.courseId);
	const newCourse = await repo.setCourseAsync(req.params.courseId, req.body.title, req.body.dept, req.body.code);
	if (course === undefined) {
		const body = formatCourseResponse(newCourse, req.originalUrl);
		res.status(StatusCodes.CREATED).send(body);
	} else {
		res.sendStatus(StatusCodes.NO_CONTENT);
	}
}

export async function listCourse(req: Request, res: Response, repo: CourseSectionRepository): Promise<void> {
	const course = await repo.getCourseByIdAsync(req.params.courseId);
	if (course === undefined) {
		sendNotFound(res, req.params.courseId, "course");
		return;
	} else {
		res.status(StatusCodes.OK).send({
			id: course.id,
			title: course.title,
			dept: course.dept,
			code: course.code,
			links: {
				self: `${req.originalUrl}`,
				sections: req.originalUrl + "/sections",
			},
		});
	}
}

export async function deleteCourse(req: Request, res: Response, repo: CourseSectionRepository): Promise<void> {
	const course = await repo.getCourseByIdAsync(req.params.courseId);
	if (course === undefined) {
		sendNotFound(res, req.params.courseId, "course");
		return;
	}
	await repo.deleteCourse(course);
	res.status(StatusCodes.OK).send({
		id: course.id,
		title: course.title,
		dept: course.dept,
		code: course.code,
		sections: course.sections.length,
	});
}
