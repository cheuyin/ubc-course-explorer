export const objectType = {
	BUILDING: "building",
	ROOM: "room",
}; // used for representing objects in Errors

// @400
export class BadRequestError extends Error {
	public params: any;
	constructor(params: any) {
		super();
		this.name = "Invalid request parameters";
		this.params = params;
	}
}

// @404
export class NotFoundError extends Error {
	constructor(obj: string, id: string) {
		super("no " + obj + " with id '" + id + "'");
		this.name = "Not found";
	}
}

// @422
export class ValidationError extends Error {
	public fields: any;
	constructor(fields: any) {
		super();
		this.name = "Validation failed";
		this.fields = fields;
	}
}

// @500
export class InternalServerError extends Error {
	constructor() {
		super();
		this.name = "Internal server error";
	}
}
