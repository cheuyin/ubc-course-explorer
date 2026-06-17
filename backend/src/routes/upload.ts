import { Router, Request, Response, NextFunction } from "express";
import { Repositories } from "../App";
import { getUploadStatistics, uploadData } from "../controllers/uploadControllers";
import multer from "multer";
import { StatusCodes } from "http-status-codes";

export function uploadRoutes(repos: Repositories): Router {
	const r = Router({ mergeParams: true });

	const upload = multer({ storage: multer.memoryStorage() });
	const multerUpload = upload.single("archive");

	const safeUploadMiddleware = (req: Request, res: Response, next: NextFunction): void => {
		void multerUpload(req, res, (err) => {
			// Catches if req.body.archive isn't attached
			if (err) {
				console.log(err);
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

				return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
					error: "Validation failed",
					fields: validationErrors,
				});
			}

			next();
		});
	};

	r.post("/", safeUploadMiddleware, async (req, res) => uploadData(req, res, repos));
	r.get("/:id", async (req, res) => getUploadStatistics(req, res));

	return r;
}
