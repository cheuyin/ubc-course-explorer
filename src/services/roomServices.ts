import { NotFoundError, objectType } from "../middleware/errorTypes";
import { BuildingRoomRepository } from "../repositories/buildingRoomRepository";

interface ListRoomsInput {
	limit: number;
	offset: number;
	buildingId: string;
	repo: BuildingRoomRepository;
	originalUrl: string;
}

interface ListRoomInput {
	buildingId: string;
	roomId: string;
	repo: BuildingRoomRepository;
	originalUrl: string;
}

interface CreateRoomInput {
	buildingId: string;
	roomId: string;
	repo: BuildingRoomRepository;
	originalUrl: string;
	body: Record<string, any>;
}

export async function listRoomsService(input: ListRoomsInput): Promise<any> {
	const building = await input.repo.getBuildingById(input.buildingId);
	if (building === undefined) {
		throw new NotFoundError(objectType.BUILDING, input.buildingId); // duplicated code - can be refactored in later PR
	}

	const rooms = input.repo.getRooms(building);
	const paginatedResults = rooms.slice(input.offset, input.offset + input.limit);
	// code above based on - https://canvas.ubc.ca/courses/176257/assignments/2334739
	// code above taken from courseControllers.ts
	const body = {
		total: rooms.length,
		limit: input.limit,
		offset: input.offset,
		items: paginatedResults.map(
			(room: {
				id: any;
				buildingId: any;
				roomNumber: any;
				roomType: any;
				furnitureType: any;
				href: any;
				seats: any;
			}) => {
				return {
					id: room.id,
					building: room.buildingId,
					number: room.roomNumber,
					type: room.roomType,
					furniture: room.furnitureType,
					href: room.href,
					seats: room.seats,
					links: {
						self: input.originalUrl + `/${room.id}`,
						building: `${input.originalUrl}`.split("/rooms")[0],
					},
				};
			}
		),
	};
	return body;
}

export async function listRoomService(input: ListRoomInput): Promise<any> {
	const building = await input.repo.getBuildingById(input.buildingId);
	let body;
	if (building === undefined) {
		throw new NotFoundError(objectType.BUILDING, input.buildingId);
	}
	const room = await input.repo.getRoomById(building, input.roomId);
	if (room === undefined) {
		throw new NotFoundError(objectType.ROOM, input.roomId);
	} else {
		body = {
			id: room.id,
			building: room.buildingId,
			number: room.roomNumber,
			type: room.roomType,
			furniture: room.furnitureType,
			href: room.href,
			seats: room.seats,
			links: {
				self: input.originalUrl,
				building: `${input.originalUrl}`.split("/rooms")[0],
			},
		};
	}
	return body;
}

export async function createRoomService(input: CreateRoomInput): Promise<any> {
	const building = await input.repo.getBuildingById(input.buildingId);
	let response;
	if (building === undefined) {
		throw new NotFoundError(objectType.BUILDING, input.buildingId);
	}

	response = {
		error: "Validation failed",
		fields: {},
	};

	const room = await input.repo.getRoomById(building, input.roomId);
	const newRoom = await input.repo.setRoom(
		building,
		input.roomId,
		input.body.number,
		input.body.type,
		input.body.furniture,
		input.body.href,
		input.body.seats
	);
	if (room === undefined) {
		response = {
			id: newRoom.id,
			building: newRoom.buildingId,
			number: newRoom.roomNumber,
			type: newRoom.roomType,
			furniture: newRoom.furnitureType,
			href: newRoom.href,
			seats: newRoom.seats,
			links: {
				self: input.originalUrl,
				building: `${input.originalUrl}`.split("/rooms")[0],
			},
		};
	} else {
		response = {
			empty: "no content",
		};
	}
	return response;
}

export async function deleteRoomService(input: ListRoomInput): Promise<any> {
	const building = await input.repo.getBuildingById(input.buildingId);
	let response;
	if (building === undefined) {
		throw new NotFoundError(objectType.BUILDING, input.buildingId);
	}
	const room = await input.repo.getRoomById(building, input.roomId);
	if (room === undefined) {
		throw new NotFoundError(objectType.ROOM, input.roomId);
	} else {
		const deleted = input.repo.deleteRoom(building, input.roomId);
		response = {
			id: deleted.id,
			building: deleted.buildingId,
			number: deleted.roomNumber,
			type: deleted.roomType,
			furniture: deleted.furnitureType,
			href: deleted.href,
			seats: deleted.seats,
		};
	}
	return response;
}
