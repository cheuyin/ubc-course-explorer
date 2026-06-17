import JSZip from "jszip";
import { BuildingRoomRepository, buildingsEqual, roomsEqual } from "../repositories/buildingRoomRepository";
import { Building } from "../models/building";
import { Room } from "../models/room";
import { FacilitiesJob, Job, JobsTracker } from "./uploadControllers";
import { parse } from "parse5";
import path from "path";
import {
	type Parse5Element,
	type Parse5Document,
	findElementsByAttr,
	findFirstElementByAttr,
	getFirstTextNodeValue,
	filterElementNodes,
	cleanString,
} from "../utils/parse5Helpers";

export interface JobStatsFacilities {
	buildings_added: number;
	buildings_modified: number;
	rooms_added: number;
	rooms_modified: number;
}

export async function createNewJobFacilities(jobsTracker: JobsTracker): Promise<string> {
	const jobId = `upload_${Date.now()}`;
	const newJob: Job = {
		id: jobId,
		status: "processing",
		kind: "facilities",
		message: "Processing in progress",
		stats: {
			buildings_added: 0,
			buildings_modified: 0,
			rooms_added: 0,
			rooms_modified: 0,
		},
	};
	jobsTracker.set(jobId, newJob);
	return jobId;
}

export async function startProcessingFacilities(
	jobId: string,
	zipBuffer: Buffer,
	buildingModel: BuildingRoomRepository,
	jobsTracker: JobsTracker
): Promise<void> {
	const job = jobsTracker.get(jobId)! as FacilitiesJob;

	const result = await parseFacilitiesZip(zipBuffer);
	if (typeof result === "string") {
		job.status = "failed";
		job.message = result;
		return;
	}

	const buildingTable = findElementsByAttr(result.childNodes, "class", "views-table").find(
		(element) => element.tagName === "table"
	);
	if (!buildingTable) {
		job.status = "failed";
		job.message = "No building table found in index.htm";
		return;
	}

	let zip;
	try {
		zip = await JSZip.loadAsync(zipBuffer);
	} catch {
		job.status = "failed";
		job.message = "Data is not in a valid zip format";
		return;
	}

	let buildings;
	try {
		buildings = await parseBuildings(buildingTable);
	} catch (err) {
		if (err instanceof Error && err.message) {
			job.status = "failed";
			job.message = err.message;
			return;
		}
	}

	if (!buildings) {
		job.status = "failed";
		job.message = "Failed to parse buildings";
		return;
	}

	// parse room data for each building
	for (const building of buildings) {
		await parseRooms(building, zip);
	}

	// insert the data while updating job stats
	const existingBuildings = await buildingModel.getBuildings();

	for (const building of buildings) {
		const existingBuilding = existingBuildings.find((b) => b.id === building.id);
		if (existingBuilding) {
			if (!buildingsEqual(existingBuilding, building)) {
				const { link, ...rest } = building;
				Object.assign(existingBuilding, rest);
				job.stats.buildings_modified++;
			}
		} else {
			existingBuildings.push(building);
			job.stats.buildings_added++;
		}

		for (const room of building.rooms) {
			if (existingBuilding) {
				const existingRoom = existingBuilding.rooms.find((r) => r.id === room.id);
				if (existingRoom) {
					if (!roomsEqual(room, existingRoom)) {
						Object.assign(existingRoom, room);
						job.stats.rooms_modified++;
					}
				} else {
					existingBuilding.rooms.push(room);
					job.stats.rooms_added++;
				}
			} else {
				job.stats.rooms_added++;
			}
		}
	}

	await buildingModel.persistToDisk();
	job.status = "completed";
	job.message = "Dataset processing complete";
}

// Reads building's htm file from the zip and extracts room information
// Stores room information in Building's rooms array
async function parseRooms(building: Building, zip: JSZip): Promise<void> {
	if (!building.link) {
		return;
	}

	// Building links are relative to index.htm, so resolve from its directory
	const indexHtmFile = zip.file("index.htm") ?? zip.file(/\/index\.htm$/)[0];
	const indexDir = indexHtmFile ? path.posix.dirname(indexHtmFile.name) : "";
	const prefix = indexDir === "." ? "" : indexDir + "/";

	const roomFileUrl = path.posix.normalize(`${prefix}${building.link}`);

	const roomFile = zip.file(roomFileUrl);
	if (!roomFile) {
		return;
	}

	let roomHtmContent;
	try {
		roomHtmContent = await roomFile.async("string");
	} catch {
		console.error("Error converting file to a string");
		return;
	}

	let isActuallyBroken = false;
	const parsedRoomHtm = parse(roomHtmContent, {
		onParseError: (err) => {
			if (err.code !== "missing-doctype") {
				isActuallyBroken = true;
			}
		},
	});

	if (isActuallyBroken) return;

	const roomTable = findElementsByAttr(parsedRoomHtm.childNodes, "class", "views-table").find(
		(element) => element.tagName === "table"
	);
	if (!roomTable) return;

	const tbody = filterElementNodes(roomTable.childNodes).find((element) => element.tagName === "tbody");
	if (!tbody) return;

	const roomRows = filterElementNodes(tbody.childNodes).filter((element) => element.tagName === "tr");

	for (const row of roomRows) {
		const numberCell = findFirstElementByAttr(row.childNodes, "class", "views-field-field-room-number");
		const numberAnchor = numberCell && filterElementNodes(numberCell.childNodes).find((node) => node.tagName === "a");
		const number = numberAnchor && getFirstTextNodeValue(numberAnchor);

		const seatsCell = findFirstElementByAttr(row.childNodes, "class", "views-field-field-room-capacity");
		const seatsText = seatsCell && getFirstTextNodeValue(seatsCell);

		const furnitureCell = findFirstElementByAttr(row.childNodes, "class", "views-field-field-room-furniture");
		const furniture = furnitureCell && getFirstTextNodeValue(furnitureCell);

		const typeCell = findFirstElementByAttr(row.childNodes, "class", "views-field-field-room-type");
		const type = typeCell && getFirstTextNodeValue(typeCell);

		const hrefCell = findFirstElementByAttr(row.childNodes, "class", "views-field-nothing");
		const hrefAnchor = hrefCell && filterElementNodes(hrefCell.childNodes).find((node) => node.tagName === "a");
		const href = hrefAnchor && (hrefAnchor.attrs.find((attr) => attr.name === "href")?.value ?? null);

		if (!number || !seatsText || !furniture || !type || !href) continue;

		const seats = Number(seatsText.trim());
		if (isNaN(seats)) continue;

		const room: Room = {
			id: `${building.id}_${cleanString(number)}`,
			buildingId: building.id,
			roomNumber: cleanString(number),
			seats: seats,
			furnitureType: cleanString(furniture),
			roomType: cleanString(type),
			href: cleanString(href),
		};

		building.rooms.push(room);
	}
}

// Parse the <table> node containing rows of buildings to return an array of Building objects
// Rooms will be empty because they haven't been processed yet
// Invalid buildings will not be included in the result
async function parseBuildings(buildingTable: Parse5Element): Promise<Building[]> {
	const tbody = filterElementNodes(buildingTable.childNodes).find((element) => element.tagName === "tbody");
	if (!tbody) {
		throw new Error("No tbody found in building table");
	}
	const buildingRows = filterElementNodes(tbody.childNodes).filter((element) => element.tagName === "tr");

	const partialBuildings: Partial<Building>[] = [];

	for (const buildingRow of buildingRows) {
		const titleCell = findFirstElementByAttr(buildingRow.childNodes, "class", "views-field-title");

		const anchor = titleCell && filterElementNodes(titleCell.childNodes).find((node) => node.tagName === "a");

		let fullName = anchor && getFirstTextNodeValue(anchor);
		let link = anchor && (anchor.attrs.find((attr) => attr.name === "href")?.value ?? null);

		const shortNameElement = findFirstElementByAttr(buildingRow.childNodes, "class", "views-field-field-building-code");
		let shortName = shortNameElement && getFirstTextNodeValue(shortNameElement);

		const addressElement = findFirstElementByAttr(
			buildingRow.childNodes,
			"class",
			"views-field-field-building-address"
		);
		let address = addressElement && getFirstTextNodeValue(addressElement);

		if (!fullName || !link || !shortName || !address) {
			continue;
		} else {
			fullName = cleanString(fullName);
			shortName = cleanString(shortName);
			address = cleanString(address);
			link = cleanString(link);
		}

		partialBuildings.push({
			id: shortName,
			name: fullName,
			address: address,
			link: link,
			rooms: [],
		});
	}

	// buildings with complete fields, including geolocation information
	const completeBuildings: Building[] = [];

	const results = await Promise.allSettled(
		partialBuildings.map(async (partialBuilding) => {
			return fetchBuildingCoords(partialBuilding.address);
		})
	);

	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === "fulfilled") {
			const partialBuilding = partialBuildings[i];
			completeBuildings.push({
				id: partialBuilding.id!,
				name: partialBuilding.name!,
				address: partialBuilding.address!,
				link: partialBuilding.link,
				lat: result.value.lat,
				lon: result.value.lon,
				rooms: partialBuilding.rooms!,
			});
		}
		// Skip buildings where geolocation fetch failed
	}

	return completeBuildings;
}

interface GeolocationInformation {
	lat: number;
	lon: number;
}
// Given a building address, fetch geolocation information from the given web service
// Returns GeolocationInformation if successful, throws Error otherwise
async function fetchBuildingCoords(address?: string): Promise<GeolocationInformation> {
	if (!address) throw new Error(`Address cannot be empty`);
	const CPSC_310_TEAM_NUMBER = 23;
	try {
		const geolocationUrl = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team${CPSC_310_TEAM_NUMBER}/${encodeURIComponent(address)}`;
		const TIMEOUT_DURATION = 3000;
		const res = await fetch(geolocationUrl, { signal: AbortSignal.timeout(TIMEOUT_DURATION) });
		if (!res.ok) {
			throw new Error(`Failed to fetch geo information - Status: ${res.status}`);
		}
		const data = await res.json();

		if (data.lat && data.lon && typeof data.lat === "number" && typeof data.lon === "number") {
			return {
				lat: data.lat,
				lon: data.lon,
			};
		} else {
			throw new Error("Returned data was incorrectly formatted");
		}
	} catch (error) {
		if (error instanceof Error) {
			console.error("Fetch error:", error.message);
		}
		throw error;
	}
}

// Expects a zip buffer containing htm files
// Returns a string error message if not valid
// Otherwise, parses using parse5 and returns parse5 document object
async function parseFacilitiesZip(zipBuffer: Buffer): Promise<Parse5Document | string> {
	let zip;
	try {
		zip = await JSZip.loadAsync(zipBuffer);
	} catch {
		return "Data is not in a valid zip format";
	}

	const indexHtmFile = zip.file("index.htm") ?? zip.file(/\/index\.htm$/)[0];
	if (!indexHtmFile) return "Missing index.htm file";

	const indexHtmContent = await indexHtmFile.async("string");

	let isActuallyBroken = false;

	const parsedIndexHtm = parse(indexHtmContent, {
		// Purpose: Trigger error if htm file contains malformed tags and other violations
		onParseError: (err) => {
			// Ignore the "missing-doctype" whining
			// You can add other ignorable codes to this list if needed
			if (err.code !== "missing-doctype") isActuallyBroken = true;
		},
	});

	if (isActuallyBroken) return "index.htm could not be parsed";

	return parsedIndexHtm;
}
