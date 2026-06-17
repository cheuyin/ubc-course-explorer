// TODO: Create a storage adapter to consolidate file access

import fs from "fs/promises";
import path from "path";
import { Store } from "./types";

export function createFileStore(datadir: string): Store {
	return {
		async readCollection(collectionName: string): Promise<any[]> {
			try {
				const dataPath = path.join(datadir, `/${collectionName}_data.json`);
				const data = await fs.readFile(dataPath, "utf-8");
				return JSON.parse(data);
			} catch (err: any) {
				// If file doesn't exist, that's expected on first run - return empty array
				if (err.code === "ENOENT") {
					return [];
				}
				// Log other unexpected errors
				console.error("Failed to read file", err);
				return [];
			}
		},

		async writeCollection(collectionName: string, data: any[]): Promise<void> {
			const dataPath = path.join(datadir, `/${collectionName}_data.json`);
			try {
				await fs.mkdir(datadir, { recursive: true });
				await fs.writeFile(dataPath, JSON.stringify(data));
			} catch (err) {
				console.error("Failed to write file", err);
			}
		},
	};
}
