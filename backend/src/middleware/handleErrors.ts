import { StatusCodes } from "http-status-codes";
import { BadRequestError, InternalServerError, NotFoundError, ValidationError } from "./errorTypes";
import type { NextFunction, Request, Response } from "express";

export function handleErrors(err: unknown, req: Request, res: Response, next: NextFunction): void {
	if (err instanceof BadRequestError) {
		res.status(StatusCodes.BAD_REQUEST).json({ error: err.name, params: err.params });
		return;
	} else if (err instanceof NotFoundError) {
		res.status(StatusCodes.NOT_FOUND).json({ error: err.name, message: err.message });
		return;
	} else if (err instanceof ValidationError) {
		res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: err.name, fields: err.fields });
		return;
	} else if (err instanceof InternalServerError) {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err.name });
	}
}
