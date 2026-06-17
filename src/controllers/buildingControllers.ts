import type { NextFunction, Request, Response } from "express";
import { BuildingRoomRepository } from "../repositories/buildingRoomRepository";
import { StatusCodes } from "http-status-codes";
import {
	createBuildingService,
	deleteBuildingService,
	listBuildingService,
	listBuildingsService,
} from "../services/resources/buildingServices";

// below code written with Copilot - note that function def'ns were rewritten with copilot during refactor
export const listBuildings =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		// below code written with Copilot

		const limit = req.query.limit ? Number(req.query.limit as string) : 100;
		const offset = req.query.offset ? Number(req.query.offset as string) : 0;

		// above code written with Copilot

		try {
			const response = await listBuildingsService({ limit, offset, repo, originalUrl: req.originalUrl });
			res.status(StatusCodes.OK).send(response);
		} catch (error: unknown) {
			next(error);
		}
	};

export const listBuilding =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		try {
			const response = await listBuildingService({
				buildingId: req.params.buildingId,
				repo,
				originalUrl: req.originalUrl,
			});
			res.status(StatusCodes.OK).send(response);
		} catch (error: unknown) {
			next(error);
		}
	};

export const createBuilding =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		try {
			const response = await createBuildingService({
				buildingId: req.params.buildingId,
				name: req.body.name,
				address: req.body.address,
				lat: req.body.lat,
				lon: req.body.lon,
				repo,
				originalUrl: req.originalUrl,
			});
			if (response) {
				res.status(StatusCodes.CREATED).send(response);
			} else {
				res.sendStatus(StatusCodes.NO_CONTENT);
			}
		} catch (error: unknown) {
			next(error);
		}
	};

export const deleteBuilding =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		try {
			const body = await deleteBuildingService({
				buildingId: req.params.buildingId,
				repo,
				originalUrl: req.originalUrl,
			});
			res.status(StatusCodes.OK).send(body);
		} catch (error: unknown) {
			next(error);
		}
	};
