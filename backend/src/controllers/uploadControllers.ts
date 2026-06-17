import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Repositories } from "../App";
import {
	createNewJobCourseOfferings,
	JobStatsCourseOfferings,
	startProcessingCourseOfferings,
} from "./processCourseOfferings";
import { JobStatsFacilities, startProcessingFacilities, createNewJobFacilities } from "./processFacilities";

interface BaseJob {
	id: string;
	status: "processing" | "completed" | "failed";
	message: string;
}

export interface CourseOfferingsJob extends BaseJob {
	kind: "course_offerings";
	stats: JobStatsCourseOfferings;
}

export interface FacilitiesJob extends BaseJob {
	kind: "facilities";
	stats: JobStatsFacilities;
}

export type Job = CourseOfferingsJob | FacilitiesJob;

export type JobsTracker = Map<string, Job>;

// In-memory store for upload jobs
const jobsTracker: JobsTracker = new Map<string, Job>();

export async function uploadData(req: Request, res: Response, repos: Repositories): Promise<void> {
	const validationErrors: Record<string, string> = {};

	if (req.body.kind === undefined) {
		validationErrors.kind = "required but missing";
	} else if (req.body.kind !== "course_offerings" && req.body.kind !== "facilities") {
		validationErrors.kind = "expected to be course_offerings or facilities";
	}

	if (!req.file) {
		validationErrors.archive = "required but missing";
	} else if (req.file.size === 0) {
		validationErrors.archive = "expected non-empty file";
	}

	if (Object.keys(validationErrors).length > 0) {
		res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
			error: "Validation failed",
			fields: validationErrors,
		});
		return;
	}

	let jobId;

	if (req.body.kind === "course_offerings") {
		jobId = await createNewJobCourseOfferings(jobsTracker);
		startProcessingCourseOfferings(jobId, req.file!.buffer, repos.courses, jobsTracker).catch((error) => {
			console.error("Background processing crashed:", error);
		});
	} else {
		jobId = await createNewJobFacilities(jobsTracker);
		startProcessingFacilities(jobId, req.file!.buffer, repos.buildings, jobsTracker).catch((error) => {
			console.error("Background processing crashed:", error);
		});
	}

	res.status(StatusCodes.ACCEPTED).json({
		id: jobId,
		status: "processing",
		kind: req.body.kind,
		message: "Dataset accepted for processing",
	});
}

export async function getUploadStatistics(req: Request, res: Response): Promise<void> {
	const job = jobsTracker.get(req.params.id);

	if (!job) {
		res.status(StatusCodes.NOT_FOUND).json({
			error: "Not found",
			message: `no dataset with id '${req.params.id}'`,
		});
		return;
	}

	res.status(StatusCodes.OK).json(job);
}
