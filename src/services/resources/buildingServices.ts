import { NotFoundError, objectType } from "../../middleware/ErrorTypes";
import { BuildingRoomRepository } from "../../repositories/buildingRoomRepository";

// TODO: remove dependency on controller for getting the BuildingModel

interface ListBuildingsInput {
	limit: number;
	offset: number;
	repo: BuildingRoomRepository;
	originalUrl: string;
}

interface ListBuildingInput {
	buildingId: string;
	repo: BuildingRoomRepository;
	originalUrl: string;
}

interface CreateBuildingInput {
	buildingId: string;
	name: string;
	address: string;
	lat: number;
	lon: number;
	repo: BuildingRoomRepository;
	originalUrl: string;
}

export async function listBuildingsService(input: ListBuildingsInput): Promise<any> {
	const buildings = await input.repo.getBuildings();
	const paginatedResults = buildings.slice(input.offset, input.offset + input.limit);
	// code above based on - https://canvas.ubc.ca/courses/176257/assignments/2334739
	// code above taken from courseControllers.ts
	const body = {
		total: buildings.length,
		limit: input.limit,
		offset: input.offset,
		items: paginatedResults.map((building) => {
			return {
				id: building.id,
				name: building.name,
				address: building.address,
				lat: building.lat,
				lon: building.lon,
				links: {
					self: input.originalUrl + `/${building.id}`,
					rooms: input.originalUrl + `/${building.id}/rooms`,
				},
			};
		}),
	};
	return body;
}

export async function listBuildingService(input: ListBuildingInput): Promise<any> {
	const building = await input.repo.getBuildingById(input.buildingId);
	let body;
	if (building === undefined) {
		throw new NotFoundError(objectType.BUILDING, input.buildingId);
	} else {
		body = {
			id: building.id,
			name: building.name,
			address: building.address,
			lat: building.lat,
			lon: building.lon,
			links: {
				self: input.originalUrl,
				rooms: input.originalUrl + "/rooms",
			},
		};
	}
	return body;
}

export async function createBuildingService(input: CreateBuildingInput): Promise<any> {
	const building = await input.repo.getBuildingById(input.buildingId);
	const newBuilding = await input.repo.setBuilding(input.buildingId, input.name, input.address, input.lat, input.lon);
	let resBody;
	if (building === undefined) {
		resBody = {
			id: newBuilding.id,
			name: newBuilding.name,
			address: newBuilding.address,
			lat: newBuilding.lat,
			lon: newBuilding.lon,
			links: {
				self: input.originalUrl,
				rooms: input.originalUrl + `/rooms`,
			},
		};
	}

	return resBody;
}

export async function deleteBuildingService(input: ListBuildingInput): Promise<any> {
	const building = await input.repo.getBuildingById(input.buildingId); // extract this logic into services later once middleware extracted
	let body;
	if (building === undefined) {
		throw new NotFoundError(objectType.BUILDING, input.buildingId);
	} else {
		await input.repo.deleteBuilding(building);
		body = {
			id: building.id,
			name: building.name,
			address: building.address,
			lat: building.lat,
			lon: building.lon,
			rooms: building.rooms.length,
		};
	}
	return body;
}
