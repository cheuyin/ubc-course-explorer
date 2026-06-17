import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import JSZip from "jszip";
import { CourseSectionRepository } from "../../repositories/courseSectionRepository";

// --- Job Tracking Interfaces & Storage ---
interface JobStats {
	files_total: number;
	files_processed: number;
	files_skipped: number;
	courses_seen: number;
	courses_added: number;
	courses_modified: number;
	sections_seen: number;
	sections_added: number;
	sections_modified: number;
}

interface Job {
	id: string;
	status: "processing" | "completed" | "failed";
	kind: string;
	stats: JobStats;
	message: string;
}

// In-memory store for upload jobs
const jobsTracker = new Map<string, Job>();

// --- GET Controller: Retrieve Job Status ---
export async function getUploadStatistics(req: Request, res: Response, repo: CourseSectionRepository): Promise<void> {
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

// --- POST Controller: Handle Upload ---
export async function uploadData(req: Request, res: Response, repo: CourseSectionRepository): Promise<void> {
	const validationErrors: Record<string, string> = {};

	if (req.body.kind === undefined) {
		validationErrors.kind = "required but missing";
	} else if (req.body.kind !== "course_offerings") {
		validationErrors.kind = "expected to be course_offerings";
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
	// 3. Create the Job
	const jobId = `upload_${Date.now()}`;
	const newJob: Job = {
		id: jobId,
		status: "processing",
		kind: "course_offerings",
		message: "Processing in progress",
		stats: {
			files_total: 0,
			files_processed: 0,
			files_skipped: 0,
			courses_seen: 0,
			courses_added: 0,
			courses_modified: 0,
			sections_seen: 0,
			sections_added: 0,
			sections_modified: 0,
		},
	};
	jobsTracker.set(jobId, newJob);

	// 4. Fire and forget the background process
	// (We will add the floating promise fix here later if you want!)
	processDatasetInBackground(jobId, req.file!.buffer, repo).catch((error) => {
		console.error("Background processing crashed:", error);
	});

	// 5. Respond immediately
	res.status(StatusCodes.ACCEPTED).json({
		id: jobId,
		status: "processing",
		kind: "course_offerings",
		message: "Dataset accepted for processing",
	});
}

// --- The Background Worker ---
async function processDatasetInBackground(
	jobId: string,
	zipBuffer: Buffer,
	repo: CourseSectionRepository
): Promise<void> {
	const job = jobsTracker.get(jobId)!;

	try {
		const zip = await JSZip.loadAsync(zipBuffer);

		// Validate root courses directory
		const hasCoursesDir = Object.keys(zip.files).some((filename) => filename.startsWith("courses/"));
		if (!hasCoursesDir) {
			job.status = "failed";
			job.message = "Missing root courses directory";
			return;
		}

		const coursesToSave = new Map<string, { code: string; title: string; dept: string; maxYear: number }>();
		const sectionsToSave = new Map<string, any>();

		// --- 1. ZIP PARSING LOOP (Refactored with Promise.all to fix ESLint) ---
		const filePromises = Object.entries(zip.files).map(async ([filename, fileData]) => {
			if (!filename.startsWith("courses/") || fileData.dir) return;
			job.stats.files_total++;

			try {
				// This await is now safely running in parallel across all files!
				const fileContent = await fileData.async("string");
				const json = JSON.parse(fileContent);

				if (json.result || Array.isArray(json.result)) {
					for (const record of json.result) {
						// 1. Ensure all required fields exist (they cannot be undefined)
						const requiredKeys = [
							"id",
							"Course",
							"Title",
							"Professor",
							"Subject",
							"Section",
							"Year",
							"Avg",
							"Pass",
							"Fail",
							"Audit",
						];
						const hasRequiredData = requiredKeys.every((key) => key in record);

						if (!hasRequiredData) {
							continue; // Skip individual record, not the whole file
						}

						// 2. Validate numbers and integers according to spec
						// The spec often allows strings that look like numbers or vice-versa.
						const avg = parseFloat(record.Avg);
						const pass = parseInt(record.Pass, 10);
						const fail = parseInt(record.Fail, 10);
						const audit = parseInt(record.Audit, 10);

						// If parsing fails (NaN), then the record is truly invalid.
						if (isNaN(avg) || isNaN(pass) || isNaN(fail) || isNaN(audit)) {
							continue;
						}

						// 3. Cast fields to strings as allowed/required by the spec
						const sectionId = String(record.id);
						const yearStr = String(record.Year);
						const courseCode = String(record.Course);
						const courseTitle = String(record.Title);
						const dept = String(record.Subject);
						const instructor = String(record.Professor);
						const minYear = 1900;
						const parsedYear = String(record.Section) === "overall" ? minYear : parseInt(yearStr, 10);
						const courseId = dept + courseCode;

						// --- Group Courses ---
						if (!coursesToSave.has(courseId)) {
							job.stats.courses_seen++;
							coursesToSave.set(courseId, {
								code: courseCode,
								title: courseTitle,
								dept: dept,
								maxYear: parsedYear,
							});
						} else if (parsedYear >= coursesToSave.get(courseId)!.maxYear) {
							// Update title if this record is newer
							coursesToSave.set(courseId, {
								code: courseCode,
								title: courseTitle,
								dept: dept,
								maxYear: parsedYear,
							});
						}

						// --- Group Sections ---
						if (!sectionsToSave.has(sectionId)) {
							job.stats.sections_seen++;
							sectionsToSave.set(sectionId, {
								courseId: courseId,
								instructor: instructor,
								year: parsedYear,
								avg: record.Avg,
								pass: record.Pass,
								fail: record.Fail,
								audit: record.Audit,
							});
						}
					}
					job.stats.files_processed++;
					return; // Return instead of continue inside a map/promise
				} else {
					job.stats.files_skipped++;
				}
			} catch (_err) {
				job.stats.files_skipped++;
			}
		});

		// Wait for all zip files to be processed simultaneously
		await Promise.all(filePromises);

		// --- 2. DATABASE WRITE LOOPS (Optimized with Promise.all) ---
		await repo.getCourses();
		// Batch 1: Process all Courses in parallel
		const coursePromises = Array.from(coursesToSave.entries()).map(async ([courseId, courseData]) => {
			const existingCourse = await repo.getCourseByIdAsync(courseId);

			if (!existingCourse) {
				await repo.setCourseDataset(courseId, courseData.title, courseData.dept, courseData.code);
				job.stats.courses_added++;
			} else {
				await repo.setCourseDataset(courseId, courseData.title, courseData.dept, courseData.code);
				job.stats.courses_modified++;
			}
		});

		await Promise.all(coursePromises);

		// Batch 2: Process all Sections in parallel
		// Note: We wait for courses to finish first so parentCourse lookups succeed
		const sectionPromises = Array.from(sectionsToSave.entries()).map(async ([sectionId, sectionData]) => {
			const parentCourse = await repo.getCourseByIdAsync(sectionData.courseId);
			if (!parentCourse) {
				return;
			}

			const existingSection = await repo.getSectionByIdAsync(parentCourse, sectionId);

			const isModified =
				existingSection &&
				(existingSection.instructor !== sectionData.instructor ||
					existingSection.year !== sectionData.year ||
					existingSection.avg !== sectionData.avg ||
					existingSection.pass !== sectionData.pass ||
					existingSection.fail !== sectionData.fail ||
					existingSection.audit !== sectionData.audit);

			if (!existingSection || isModified) {
				await repo.setSectionDataset(
					parentCourse,
					sectionId,
					sectionData.instructor,
					sectionData.year,
					sectionData.avg,
					sectionData.pass,
					sectionData.fail,
					sectionData.audit
				);

				if (!existingSection) {
					job.stats.sections_added++;
				} else {
					job.stats.sections_modified++;
				}
			}
		});

		await Promise.all(sectionPromises);
		await repo.persistToDisk();

		job.status = "completed";
		job.message = "Dataset processing complete";
	} catch (_err) {
		job.status = "failed";
		job.message = "Data is not in a valid zip format";
	}
}
