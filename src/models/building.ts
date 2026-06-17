import { Room } from "./room";

export interface Building {
	id: string;
	name: string;
	address: string;
	link?: string; // links to the Building's web page in the bulk upload html file
	lat: number;
	lon: number;
	rooms: Room[];
}
