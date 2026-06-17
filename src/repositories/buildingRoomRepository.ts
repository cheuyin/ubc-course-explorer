import { Building } from "../models/building";
import { Room } from "../models/room";
import { Store } from "../storage/types";

export class BuildingRoomRepository {
	private store: Store;

	constructor(store: Store) {
		this.store = store;
	}

	protected data: { buildings: Building[] } = { buildings: [] };

	private async readData(): Promise<Building[]> {
		const data = await this.store.readCollection("buildings");
		return data;
	}

	private async writeData(buildings: Building[]): Promise<void> {
		await this.store.writeCollection("buildings", buildings);
	}

	// Below code written by Gemini - Add a synchronization method to Model.ts
	public async persistToDisk(): Promise<void> {
		await this.writeData(this.data.buildings);
	}
	// above code written by gemini

	public async getBuildings(): Promise<Building[]> {
		this.data.buildings = await this.readData();
		return this.data.buildings;
	}

	public async getBuildingById(id: string): Promise<Building | undefined> {
		return this.data.buildings.find((building) => building.id === id);
	}

	public async setBuilding(id: string, name: string, address: string, lat: number, lon: number): Promise<Building> {
		let building = await this.getBuildingById(id);
		if (building === undefined) {
			building = { id, name, address, lat, lon, rooms: [] };
			this.data.buildings.push(building);
			this.data.buildings.sort((a, b) => a.id.localeCompare(b.id)); // written using https://pythonguides.com/sort-string-arrays-in-typescript/
		} else {
			building.name = name;
			building.address = address;
			building.lat = lat;
			building.lon = lon;
		}
		await this.writeData(this.data.buildings);
		return building;
	}

	public async deleteBuilding(building: Building): Promise<Building> {
		const index = this.data.buildings.findIndex((b) => b.id === building.id);
		const deleted = this.data.buildings.splice(index, 1);
		await this.writeData(this.data.buildings);
		return deleted[0];
	}

	public getRooms(building: Building): Room[] {
		return building.rooms;
	}

	public async getRoomById(building: Building, id: string): Promise<Room | undefined> {
		return building.rooms.find((room) => room.id === id);
	}

	public async setRoom(
		building: Building,
		id: string,
		number: string,
		type: string,
		furniture: string,
		href: string,
		seats: number
	): Promise<Room> {
		let room = await this.getRoomById(building, id);
		if (!room) {
			room = {
				id,
				buildingId: building.id,
				roomNumber: number,
				roomType: type,
				furnitureType: furniture,
				href,
				seats,
			};
			building.rooms.push(room);
			building.rooms.sort((a, b) => a.id.localeCompare(b.id)); // written using https://pythonguides.com/sort-string-arrays-in-typescript/
		} else {
			room.roomNumber = number;
			room.roomType = type;
			room.furnitureType = furniture;
			room.href = href;
			room.seats = seats;
		}
		await this.writeData(this.data.buildings);
		return room;
	}
	public deleteRoom(building: Building, roomId: string): Room {
		const index = building.rooms.findIndex((room) => room.id === roomId);
		const deleted = building.rooms.splice(index, 1);
		return deleted[0];
	}
}

export function buildingsEqual(a: Building, b: Building): boolean {
	return a.id === b.id && a.name === b.name && a.address === b.address && a.lat === b.lat && a.lon === b.lon;
}

export function roomsEqual(a: Room, b: Room): boolean {
	return (
		a.id === b.id &&
		a.buildingId === b.buildingId &&
		a.roomNumber === b.roomNumber &&
		a.roomType === b.roomType &&
		a.furnitureType === b.furnitureType &&
		a.href === b.href &&
		a.seats === b.seats
	);
}
