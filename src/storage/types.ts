export interface Store {
	readCollection(collectionName: string): Promise<any[]>;
	writeCollection(collectionName: string, data: any[]): Promise<void>;
}
