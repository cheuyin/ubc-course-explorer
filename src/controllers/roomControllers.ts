import type { NextFunction, Request, Response } from "express";
import { BuildingRoomRepository } from "../repositories/buildingRoomRepository";
import { StatusCodes } from "http-status-codes";
import {
	createRoomService,
	deleteRoomService,
	listRoomService,
	listRoomsService,
} from "../services/resources/roomServices";

// below code written with Copilot - note that function def'ns were rewritten with copilot during refactor
export const listRooms =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		// below code written with Copilot

		const limit = req.query.limit ? Number(req.query.limit as string) : 100;
		const offset = req.query.offset ? Number(req.query.offset as string) : 0;

		// above code written with Copilot

		try {
			const response = await listRoomsService({
				limit,
				offset,
				buildingId: req.params.buildingId,
				repo,
				originalUrl: req.originalUrl,
			});
			res.status(StatusCodes.OK).send(response);
		} catch (error: unknown) {
			next(error);
		}
	};

export const listRoom =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		try {
			const response = await listRoomService({
				buildingId: req.params.buildingId,
				roomId: req.params.roomId,
				repo,
				originalUrl: req.originalUrl,
			});
			res.status(StatusCodes.OK).send(response);
		} catch (error: unknown) {
			next(error);
		}
	};

export const createRoom =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		try {
			const response = await createRoomService({
				buildingId: req.params.buildingId,
				roomId: req.params.roomId,
				repo,
				originalUrl: req.originalUrl,
				body: req.body,
			});
			if (response.empty) {
				res.sendStatus(StatusCodes.NO_CONTENT);
			} else {
				res.status(StatusCodes.CREATED).send(response);
			}
		} catch (error: unknown) {
			next(error);
		}
	};

export const deleteRoom =
	(repo: BuildingRoomRepository) =>
	async (req: Request, res: Response, next: NextFunction): Promise<any> => {
		try {
			const response = await deleteRoomService({
				buildingId: req.params.buildingId,
				roomId: req.params.roomId,
				repo,
				originalUrl: req.originalUrl,
			});
			res.status(StatusCodes.OK).send(response);
		} catch (error: unknown) {
			next(error);
		}
	};
