import { BuildingRoomRepository } from "../repositories/buildingRoomRepository";
import { ValidationError, BadRequestError, NotFoundError, objectType } from "./errorTypes";
import type { NextFunction, Request, Response } from "express";

// function written using Copilot
export function validateBuildingBody(req: Request, res: Response, next: NextFunction): any {
	// Required fields
	const body = req.body;
	const requiredKeys = ["name", "address", "lat", "lon"] as const;
	const fields: Record<string, string> = {};
	requiredKeys.forEach((key) => {
		if (!(key in body)) {
			fields[key] = "required but missing";
		}
	});

	// String fields
	["name", "address"].forEach((key) => {
		if (!fields[key] && typeof body[key] !== "string") {
			fields[key] = "expected a string";
		}
	});

	// Number fields
	["lat", "lon"].forEach((key) => {
		if (!fields[key] && typeof body[key] !== "number") {
			fields[key] = "expected a number";
		}
	});

	if (Object.keys(fields).length > 0) {
		return next(new ValidationError(fields));
	}
	next();
}

export function validateQuery(req: Request, res: Response, next: NextFunction): any {
	const limit = req.query.limit ? Number(req.query.limit as string) : 100;
	const offset = req.query.offset ? Number(req.query.offset as string) : 0;
	const max = 5000;
	let params = {};

	if (!Number.isInteger(limit) || Number.isNaN(limit) || limit < 1 || limit > max) {
		params = {
			...params,
			limit: "expected an integer between 1 and 5000",
		};
	}
	if (!Number.isInteger(offset) || Number.isNaN(offset) || offset < 0) {
		params = {
			...params,
			offset: "expected an integer >= 0",
		};
	}
	if (Object.keys(params).length > 0) {
		return next(new BadRequestError(params));
	}

	next();
}

// written using function written by Copilot as reference
export function validateRoomBody(req: Request, res: Response, next: NextFunction): any {
	const requiredKeys = ["building", "number", "type", "furniture", "href"] as const;
	const body = req.body;
	const fields: Record<string, string> = {};
	const buildingId = req.params.buildingId;

	requiredKeys.forEach((key) => {
		if (!(key in body)) {
			fields[key] = "required but missing";
		} else if (typeof body[key] !== "string") {
			fields[key] = "expected a string";
		}
	});

	if (body.seats === undefined) {
		fields.seats = "required but missing";
	} else if (typeof body.seats !== "number" || !Number.isInteger(body.seats) || body.seats < 0) {
		fields.seats = "expected a number >= 0";
	}

	if (body.building && body.building !== buildingId) {
		fields.building = "must match parent building in path";
	}

	if (Object.keys(fields).length > 0) {
		return next(new ValidationError(fields));
	}
	next();
}

export const validateBuildingId =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		const buildingId = req.params.buildingId;
		const building = await repo.getBuildingById(buildingId);
		if (building === undefined) {
			return next(new NotFoundError(objectType.BUILDING, buildingId));
		}
		next();
	};

export const validateRoomId =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		const buildingId = req.params.buildingId;
		const building = await repo.getBuildingById(buildingId);
		const roomId = req.params.roomId;
		const room = await repo.getRoomById(building!, roomId);
		if (room === undefined) {
			return next(new NotFoundError(objectType.ROOM, roomId));
		}
		next();
	};
