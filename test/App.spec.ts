import fs from "fs/promises";
import { expect } from "chai";
import request from "supertest";
import { StatusCodes } from "http-status-codes";
import { Application, createApp } from "../src/App";
import { createFileStore } from "../src/storage/fileStore";
import { Store } from "../src/storage/types";

const {
	OK, // 200
	CREATED, // 201
	ACCEPTED, // 202
	NO_CONTENT, // 204
	NOT_FOUND, // 404
	UNPROCESSABLE_ENTITY, // 422
	BAD_REQUEST, // 400
	REQUEST_TOO_LONG, // 413
} = StatusCodes;

// Do not change datadir
const datadir = "./data" as const;

// written by Claude
async function seedCollection(store: Store, collectionName: string, testDataPath: string): Promise<void> {
	const raw = await fs.readFile(testDataPath, "utf-8");
	await store.writeCollection(collectionName, JSON.parse(raw));
}

describe("REST API v1 /api", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	// test provided, checks that app is running
	it("GET /api should respond with status OK and text 'App is running!'", async () => {
		const res = await request(app).get("/api");
		expect(res).to.have.property("status", OK);
		expect(res).to.have.property("text", "App is running!");
	});
});

describe("REST API v1 /api/v1/courses/{course}", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("PUT /api/v1/courses/cpsc310 responds with status CREATED and body cpsc310 course", async () => {
		const res = await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		expect(res.status).to.equal(CREATED);
		expect(res.body).to.deep.equal({
			id: "cpsc310",
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
			links: {
				self: "/api/v1/courses/cpsc310",
				sections: "/api/v1/courses/cpsc310/sections",
			},
		});
	});

	it("PUT /api/v1/courses/cpsc310 responds with status NO_CONTENT and body cpsc310 course", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Biology",
			code: "310",
		});
		const res = await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		expect(res.status).to.equal(NO_CONTENT);
	});

	it("PUT /api/v1/courses/cpsc310 responds with status UNPROCESSABLE_ENTITY if fields are missing", async () => {
		const res = await request(app).put("/api/v1/courses/cpsc310").send({});
		expect(res.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				title: "required but missing",
				dept: "required but missing",
				code: "required but missing",
			},
		});
	});

	it("PUT /api/v1/courses/cpsc310 responds with status UNPROCESSABLE_ENTITY if fields are wrong type", async () => {
		const res = await request(app).put("/api/v1/courses/cpsc310").send({
			title: 0,
			dept: 0,
			code: 0,
		});
		expect(res.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				title: "expected a string",
				dept: "expected a string",
				code: "expected a string",
			},
		});
	});

	it("GET /api/v1/courses/cpsc310 responds with status OK and body cpsc310 course", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		const res = await request(app).get("/api/v1/courses/cpsc310");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: "cpsc310",
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
			links: {
				self: "/api/v1/courses/cpsc310",
				sections: "/api/v1/courses/cpsc310/sections",
			},
		});
	});

	it("GET /api/v1/courses/cpsc310 responds with status NOT_FOUND if course doesn't exist", async () => {
		const res = await request(app).get("/api/v1/courses/cpsc310");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no course with id 'cpsc310'",
		});
	});

	it("DELETE /api/v1/courses/cpsc311 responds with status NOT_FOUND and body error", async () => {
		const res = await request(app).delete("/api/v1/courses/cpsc311");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no course with id 'cpsc311'",
		});
	});

	it("DELETE /api/v1/courses/cpsc310 successfully deletes a course with no sections", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		const res = await request(app).delete("/api/v1/courses/cpsc310");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: "cpsc310",
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
			sections: 0,
		});
	});

	it("DELETE /api/v1/courses/cpsc310 successfully deletes a course with 2 sections", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/21w202").send({
			instructor: "smith, john",
			year: 2021,
			avg: 74.2,
			pass: 150,
			fail: 7,
			audit: 2,
		});
		const res = await request(app).delete("/api/v1/courses/cpsc310");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: "cpsc310",
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
			sections: 2,
		});
	});
});

describe("REST API v1 /api/v1/courses", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("GET /api/v1/courses with 0 courses should respond with default params and empty items", async () => {
		const res = await request(app).get("/api/v1/courses");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 0,
			limit: 100,
			offset: 0,
			items: [],
		});
	});

	it("GET /api/v1/courses retrieves a list of courses ordered by ID (ascending)", async () => {
		await request(app).put("/api/v1/courses/courseC").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/courseD").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/courseB").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/courseA").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});

		const res = await request(app).get("/api/v1/courses");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 4,
			limit: 100,
			offset: 0,
			items: [
				{
					id: "courseA",
					title: "Introduction to Software Engineering",
					dept: "Computer Science",
					code: "310",
					links: {
						self: "/api/v1/courses/courseA",
						sections: "/api/v1/courses/courseA/sections",
					},
				},
				{
					id: "courseB",
					title: "Introduction to Software Engineering",
					dept: "Computer Science",
					code: "310",
					links: {
						self: "/api/v1/courses/courseB",
						sections: "/api/v1/courses/courseB/sections",
					},
				},
				{
					id: "courseC",
					title: "Introduction to Software Engineering",
					dept: "Computer Science",
					code: "310",
					links: {
						self: "/api/v1/courses/courseC",
						sections: "/api/v1/courses/courseC/sections",
					},
				},
				{
					id: "courseD",
					title: "Introduction to Software Engineering",
					dept: "Computer Science",
					code: "310",
					links: {
						self: "/api/v1/courses/courseD",
						sections: "/api/v1/courses/courseD/sections",
					},
				},
			],
		});
	});

	it("GET /api/v1/courses with limit and offset should respond with correct pagination", async () => {
		await request(app).put("/api/v1/courses/courseC").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/courseD").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/courseB").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/courseA").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});

		const res = await request(app).get("/api/v1/courses?limit=2&offset=1");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 4,
			limit: 2,
			offset: 1,
			items: [
				{
					id: "courseB",
					title: "Introduction to Software Engineering",
					dept: "Computer Science",
					code: "310",
					links: {
						self: "/api/v1/courses/courseB",
						sections: "/api/v1/courses/courseB/sections",
					},
				},
				{
					id: "courseC",
					title: "Introduction to Software Engineering",
					dept: "Computer Science",
					code: "310",
					links: {
						self: "/api/v1/courses/courseC",
						sections: "/api/v1/courses/courseC/sections",
					},
				},
			],
		});
	});

	it("GET /api/v1/courses with offset that is greater than total should return empty list", async () => {
		await request(app).put("/api/v1/courses/courseC").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/courseD").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/courseB").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/courseA").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});

		const res = await request(app).get("/api/v1/courses?limit=2&offset=5");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 4,
			limit: 2,
			offset: 5,
			items: [],
		});
	});

	it("GET /api/v1/courses returns BAD REQUEST if limit isn't an integer and within range", async () => {
		const res1 = await request(app).get("/api/v1/courses?limit=abc");
		expect(res1.status).to.equal(BAD_REQUEST);
		expect(res1.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
			},
		});

		const res2 = await request(app).get("/api/v1/courses?limit=0");
		expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
			},
		});

		const res3 = await request(app).get("/api/v1/courses?limit=5001");
		expect(res3.status).to.equal(BAD_REQUEST);
		expect(res3.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
			},
		});

		const res4 = await request(app).get("/api/v1/courses?limit=500.5");
		expect(res4.status).to.equal(BAD_REQUEST);
		expect(res4.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
			},
		});
	});

	it("GET /api/v1/courses returns BAD REQUEST if offset isn't an integer and within range", async () => {
		const res1 = await request(app).get("/api/v1/courses?offset=abc");
		expect(res1.status).to.equal(BAD_REQUEST);
		expect(res1.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				offset: "expected an integer >= 0",
			},
		});

		const res2 = await request(app).get("/api/v1/courses?offset=-1");
		expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				offset: "expected an integer >= 0",
			},
		});

		const res3 = await request(app).get("/api/v1/courses?offset=100.5");
		expect(res3.status).to.equal(BAD_REQUEST);
		expect(res3.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				offset: "expected an integer >= 0",
			},
		});
	});

	it("GET /api/v1/courses returns BAD REQUEST if BOTH limit and offset aren't integers and within range", async () => {
		const res = await request(app).get("/api/v1/courses?limit=abc&offset=-1");
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
				offset: "expected an integer >= 0",
			},
		});
	});
});

describe("REST API v1 /api/v1/courses/{course}/sections/{section}", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("PUT /api/v1/courses/cpsc310/sections/21w201 should respond with status CREATED and body section", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		const res = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		expect(res.status).to.equal(CREATED);
		expect(res.body).to.deep.equal({
			id: "21w201",
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
			links: {
				self: "/api/v1/courses/cpsc310/sections/21w201",
				course: "/api/v1/courses/cpsc310",
			},
		});
	});

	it("PUT /api/v1/cpsc310/sections/21w201 should respond with status NO_CONTENT", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		const res = await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 2,
		});
		expect(res.status).to.equal(204);
	});

	it("PUT /api/v1/courses/{course}/sections/{section} should respond with status NOT_FOUND and body error", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		const res = await request(app).put("/api/v1/courses/cpsc210/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no course with id 'cpsc210'",
		});
	});

	it("PUT /api/v1/courses/{course}/sections/{section} returns 422 if fields are missing", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Intro to SWE",
			dept: "Computer Science",
			code: "310",
		});
		const res = await request(app).put("/api/v1/courses/cpsc310/sections/24w201").send({});
		expect(res.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				instructor: "required but missing",
				year: "required but missing",
				avg: "required but missing",
				pass: "required but missing",
				fail: "required but missing",
				audit: "required but missing",
			},
		});
	});

	it("PUT /api/v1/courses/{course}/sections/{section} returns 422 if fields are wrong type", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Intro to SWE",
			dept: "Computer Science",
			code: "310",
		});
		const res = await request(app).put("/api/v1/courses/cpsc310/sections/24w201").send({
			instructor: null,
			year: null,
			avg: null,
			pass: null,
			fail: null,
			audit: null,
		});
		expect(res.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				instructor: "expected a string",
				year: "expected a number between 1900 and 2099",
				avg: "expected a number between 0 and 100",
				pass: "expected a number >= 0",
				fail: "expected a number >= 0",
				audit: "expected a number >= 0",
			},
		});
	});

	it("PUT /api/v1/courses/{course}/sections/{section} returns 422 if fields aren't within range", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Intro to SWE",
			dept: "Computer Science",
			code: "310",
		});

		// Too low
		const res = await request(app).put("/api/v1/courses/cpsc310/sections/24w201").send({
			instructor: "holmes, reid",
			year: 1899,
			avg: -1,
			pass: -1,
			fail: -1,
			audit: -1,
		});
		expect(res.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				year: "expected a number between 1900 and 2099",
				avg: "expected a number between 0 and 100",
				pass: "expected a number >= 0",
				fail: "expected a number >= 0",
				audit: "expected a number >= 0",
			},
		});

		// Too high
		const res2 = await request(app).put("/api/v1/courses/cpsc310/sections/24w201").send({
			instructor: "holmes, reid",
			year: 2100,
			avg: 101,
			pass: 100,
			fail: 100,
			audit: 100,
		});
		expect(res2.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res2.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				year: "expected a number between 1900 and 2099",
				avg: "expected a number between 0 and 100",
			},
		});
	});

	it("GET /api/v1/courses/cpsc310/sections/21w201 should respond with status OK and body section", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		const res = await request(app).get("/api/v1/courses/cpsc310/sections/21w201");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: "21w201",
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
			links: {
				self: "/api/v1/courses/cpsc310/sections/21w201",
				course: "/api/v1/courses/cpsc310",
			},
		});
	});

	it("GET /api/v1/courses/cpsc210/sections/21w201 should respond with status NOT_FOUND if course not found", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});

		const res = await request(app).get("/api/v1/courses/cpsc210/sections/21w201");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no course with id 'cpsc210'",
		});
	});

	it("GET /api/v1/courses/cpsc310/sections/21w202 should respond with status NOT_FOUND if section not found", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});

		const res = await request(app).get("/api/v1/courses/cpsc310/sections/21w202");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no section with id '21w202'",
		});
	});

	it("DEL /api/v1/courses/cpsc310/sections/21w201 successfully deletes a section", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		const res = await request(app).delete("/api/v1/courses/cpsc310/sections/21w201");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: "21w201",
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
	});

	it("DEL /api/v1/courses/cpsc310/sections/21w201 should respond with status NOT_FOUND if course not found", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		const res = await request(app).delete("/api/v1/courses/cpsc123/sections/21w203");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no course with id 'cpsc123'",
		});
	});

	it("DEL /api/v1/courses/cpsc310/sections/21w201 should respond with status NOT_FOUND if section not found", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/21w201").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		const res = await request(app).delete("/api/v1/courses/cpsc310/sections/21w203");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no section with id '21w203'",
		});
	});
});

describe("REST API v1 /api/v1/courses/{course}/sections", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("GET /api/v1/courses/{course}/sections returns empty list if course has no sections", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		const res = await request(app).get("/api/v1/courses/cpsc310/sections");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 0,
			limit: 100,
			offset: 0,
			items: [],
		});
	});

	it("GET /api/v1/courses/{course}/sections returns list of sections sorted by ID", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionB").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionA").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionD").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionC").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});

		const res = await request(app).get("/api/v1/courses/cpsc310/sections");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 4,
			limit: 100,
			offset: 0,
			items: [
				{
					id: "sectionA",
					instructor: "holmes, reid",
					year: 2021,
					avg: 76.4,
					pass: 167,
					fail: 3,
					audit: 1,
					links: {
						self: "/api/v1/courses/cpsc310/sections/sectionA",
						course: "/api/v1/courses/cpsc310",
					},
				},
				{
					id: "sectionB",
					instructor: "holmes, reid",
					year: 2021,
					avg: 76.4,
					pass: 167,
					fail: 3,
					audit: 1,
					links: {
						self: "/api/v1/courses/cpsc310/sections/sectionB",
						course: "/api/v1/courses/cpsc310",
					},
				},
				{
					id: "sectionC",
					instructor: "holmes, reid",
					year: 2021,
					avg: 76.4,
					pass: 167,
					fail: 3,
					audit: 1,
					links: {
						self: "/api/v1/courses/cpsc310/sections/sectionC",
						course: "/api/v1/courses/cpsc310",
					},
				},
				{
					id: "sectionD",
					instructor: "holmes, reid",
					year: 2021,
					avg: 76.4,
					pass: 167,
					fail: 3,
					audit: 1,
					links: {
						self: "/api/v1/courses/cpsc310/sections/sectionD",
						course: "/api/v1/courses/cpsc310",
					},
				},
			],
		});
	});

	it("GET /api/v1/courses/{course}/sections returns list of sections sorted by ID with pagination", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionB").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionA").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionD").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionC").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});

		const res = await request(app).get("/api/v1/courses/cpsc310/sections?limit=2&offset=2");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 4,
			limit: 2,
			offset: 2,
			items: [
				{
					id: "sectionC",
					instructor: "holmes, reid",
					year: 2021,
					avg: 76.4,
					pass: 167,
					fail: 3,
					audit: 1,
					links: {
						self: "/api/v1/courses/cpsc310/sections/sectionC",
						course: "/api/v1/courses/cpsc310",
					},
				},
				{
					id: "sectionD",
					instructor: "holmes, reid",
					year: 2021,
					avg: 76.4,
					pass: 167,
					fail: 3,
					audit: 1,
					links: {
						self: "/api/v1/courses/cpsc310/sections/sectionD",
						course: "/api/v1/courses/cpsc310",
					},
				},
			],
		});
	});

	it("GET /api/v1/courses/{course}/sections returns empty list if offset exceeds total number of sections", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionB").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionA").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionD").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});
		await request(app).put("/api/v1/courses/cpsc310/sections/sectionC").send({
			instructor: "holmes, reid",
			year: 2021,
			avg: 76.4,
			pass: 167,
			fail: 3,
			audit: 1,
		});

		const res = await request(app).get("/api/v1/courses/cpsc310/sections?offset=200");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 4,
			limit: 100,
			offset: 200,
			items: [],
		});
	});

	it("GET /api/v1/courses/{course}/sections returns BAD_REQUEST if limit is out of bounds", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});

		const res = await request(app).get("/api/v1/courses/cpsc310/sections?limit=0");
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
			},
		});

		const res2 = await request(app).get("/api/v1/courses/cpsc310/sections?limit=5001");
		expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
			},
		});

		const res3 = await request(app).get("/api/v1/courses/cpsc310/sections?limit=tomhanks");
		expect(res3.status).to.equal(BAD_REQUEST);
		expect(res3.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
			},
		});
	});

	it("GET /api/v1/courses/{course}/sections returns BAD_REQUEST if offset is out of bounds", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});

		const res = await request(app).get("/api/v1/courses/cpsc310/sections?offset=-1");
		//expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				offset: "expected an integer >= 0",
			},
		});

		const res2 = await request(app).get("/api/v1/courses/cpsc310/sections?offset=10.1");
		//expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				offset: "expected an integer >= 0",
			},
		});
	});

	it("GET /api/v1/courses/{course}/sections returns BAD_REQUEST if limit and offset are both invalid", async () => {
		await request(app).put("/api/v1/courses/cpsc310").send({
			title: "Introduction to Software Engineering",
			dept: "Computer Science",
			code: "310",
		});

		const res = await request(app).get("/api/v1/courses/cpsc310/sections?limit=abc&offset=-1");
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
				offset: "expected an integer >= 0",
			},
		});
	});

	it("GET /api/v1/courses/{course}/sections returns NOT_FOUND if course does not exist", async () => {
		const res = await request(app).get("/api/v1/courses/cpsc999/sections");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no course with id 'cpsc999'",
		});
	});
});

describe("REST API v1 /api/v1/search", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
		const store = createFileStore(datadir);
		await seedCollection(store, "courses", "test/test_data/query_data.json");
		// cannot comment in JSON files, but data in query_data.json was generated by Gemini
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});
	it("POST /api/v1/search with a basic query should respond with status 200 and course offerings with an average over 80", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					GT: {
						avg: 80,
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};
		const res = await request(app).post("/api/v1/search").send(query);
		expect(res.status).to.equal(OK);
		// below response generated by Gemini
		expect(res.body).to.deep.equal([
			{ dept: "psyc", avg: 81.4 },
			{ dept: "phys", avg: 82.5 },
			{ dept: "biol", avg: 84.1 },
			{ dept: "psyc", avg: 85.0 },
			{ dept: "cpsc", avg: 85.3 },
			{ dept: "cpsc", avg: 88.5 },
			{ dept: "engl", avg: 88.7 },
			{ dept: "cpsc", avg: 89.2 },
			{ dept: "phys", avg: 91.0 },
		]);
		// above code generated by Gemini
	});

	it("POST /api/v1/search with a basic query should respond with status 200 and an empty array (no courses match filter)", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					GT: {
						avg: 99,
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};
		const res = await request(app).post("/api/v1/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([]);
	});

	it("POST /api/v1/search with a basic query with missing parameters should respond with status 400", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};
		const res = await request(app).post("/api/v1/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "Missing WHERE",
		});
		const query2 = {
			kind: "course_offerings",
			query: {
				WHERE: {
					IS: {
						dept: "a*e",
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};
		const res2 = await request(app).post("/api/v1/search").send(query2);
		expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid query",
			message: "IS asterisks can only be first or last character",
		});
	});

	it("POST /api/v1/search for basic search with invalid or missing query/kind should respond with status 422", async () => {
		const query1 = {
			query: {
				WHERE: {
					GT: {
						avg: 80,
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};

		const res1 = await request(app).post("/api/v1/search").send(query1);
		expect(res1.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res1.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "required but missing",
			},
		});

		const query2 = {
			kind: "courses",
		};

		const res2 = await request(app).post("/api/v1/search").send(query2);
		expect(res2.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res2.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "expected to be course_offerings",
				query: "required but missing",
			},
		});

		const query3 = {
			kind: "course_offerings",
			query: 12,
		};
		const res3 = await request(app).post("/api/v1/search").send(query3);
		expect(res3.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res3.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				query: "expected an object",
			},
		});
	});

	it("POST /api/v1/search for a complex search should respond with status 200 and 5 course offerings", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 70,
									},
								},
								{
									IS: {
										dept: "cpsc",
									},
								},
							],
						},
						{
							EQ: {
								avg: 81.4,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};

		const res = await request(app).post("/api/v1/search").send(query);
		expect(res.status).to.equal(OK);
		// below code generated by Gemini
		expect(res.body).to.deep.equal([
			{ dept: "cpsc", avg: 78.1 },
			{ dept: "psyc", avg: 81.4 },
			{ dept: "cpsc", avg: 85.3 },
			{ dept: "cpsc", avg: 88.5 },
			{ dept: "cpsc", avg: 89.2 },
		]);
		// above code written with Gemini
	});

	it("POST /api/v1/search for a complex search should respond with status 200 and an empty array (no courses meet req.)", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 90,
									},
								},
								{
									IS: {
										dept: "adhe",
									},
								},
							],
						},
						{
							EQ: {
								avg: 95,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};
		const res = await request(app).post("/api/v1/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([]);
	});

	it("POST /api/v1/search with a complex query with missing parameters should respond with status 400", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 90,
									},
								},
								{
									IS: {
										dept: "adhe",
									},
								},
							],
						},
						{
							EQ: {
								avg: 95,
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v1/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "Missing OPTIONS",
		});
		const query2 = {
			kind: "course_offerings",
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 90,
									},
								},
								{
									IS: {
										dept: "adhe",
									},
								},
							],
						},
						{
							EQ: {
								avg: 95,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg", "time"],
					ORDER: "avg",
				},
			},
		};
		const res2 = await request(app).post("/api/v1/search").send(query2);
		expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid query",
			message: "Unknown key in COLUMNS",
		});
	});
	it("POST /api/v1/search for complex search with invalid or missing query/kind should respond with status 422", async () => {
		const query1 = {
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 90,
									},
								},
								{
									IS: {
										dept: "adhe",
									},
								},
							],
						},
						{
							EQ: {
								avg: 95,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};

		const res1 = await request(app).post("/api/v1/search").send(query1);
		expect(res1.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res1.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "required but missing",
			},
		});

		const query2 = {
			kind: "courses",
			query: 12,
		};

		const res2 = await request(app).post("/api/v1/search").send(query2);
		expect(res2.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res2.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "expected to be course_offerings",
				query: "expected an object",
			},
		});
	});
});

describe("REST API v1 /api/v1/datasets", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
		// cannot comment in JSON files, but data in zip files was generated by Gemini
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("POST /api/v1/datasets using an invalid zip file format should respond with status ACCEPTED - will fail during validation", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/query_data.json");
		const uploadRes = await request(app)
			.post("/api/v1/datasets")
			.field("kind", "course_offerings")
			.attach("archive", datasetBuffer, "courses.zip");
		expect(uploadRes.status).to.equal(ACCEPTED);
		expect(uploadRes.body).to.deep.equal({
			id: uploadRes.body.id,
			status: "processing",
			kind: "course_offerings",
			message: "Dataset accepted for processing",
		});
	});

	it("POST /api/v1/datasets using a valid zip file with courses added should respond with status ACCEPTED", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/upload_data1.zip");
		const uploadRes = await request(app)
			.post("/api/v1/datasets")
			.field("kind", "course_offerings")
			.attach("archive", datasetBuffer, "courses.zip");
		expect(uploadRes.status).to.equal(ACCEPTED);
		expect(uploadRes.body).to.deep.equal({
			id: uploadRes.body.id,
			status: "processing",
			kind: "course_offerings",
			message: "Dataset accepted for processing",
		});
	});

	it("POST /api/v1/datasets using a zip file without a courses root directory should respond with status ACCEPTED - validation occurs latter", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/upload_data_no_root_dir.zip");
		const uploadRes = await request(app)
			.post("/api/v1/datasets")
			.field("kind", "course_offerings")
			.attach("archive", datasetBuffer, "courses.zip");
		expect(uploadRes.status).to.equal(ACCEPTED);
		expect(uploadRes.body).to.deep.equal({
			id: uploadRes.body.id,
			status: "processing",
			kind: "course_offerings",
			message: "Dataset accepted for processing",
		});
	});

	it("POST /api/v1/datasets with wrong kind field should respond with status 422 and error msg", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/upload_data1.zip");
		const uploadRes = await request(app)
			.post("/api/v1/datasets")
			.field("kind", "courses")
			.attach("archive", datasetBuffer, "courses.zip");
		expect(uploadRes.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(uploadRes.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "expected to be course_offerings",
			},
		});
	});
	it("POST /api/v1/datasets with empty data file should respond with status 422 and error msg", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/upload_data_empty.zip");
		const uploadRes = await request(app)
			.post("/api/v1/datasets")
			.field("kind", "course_offerings")
			.attach("archive", datasetBuffer, "courses.zip");
		expect(uploadRes.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(uploadRes.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				archive: "expected non-empty file",
			},
		});
	});
	it("GET /api/v1/datasets/{id} for completed upload of valid dataset with multiple courses responds with status OK and stats, no files skipped", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/upload_data1.zip");
		const dataset = await request(app)
			.post("/api/v1/datasets")
			.field("kind", "course_offerings")
			.attach("archive", datasetBuffer, "courses.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000)); // written using information from https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
		const res = await request(app).get(`/api/v1/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "completed",
			kind: "course_offerings",
			stats: {
				files_total: 3,
				files_processed: 3,
				files_skipped: 0,
				courses_seen: 3,
				courses_added: 3,
				courses_modified: 0,
				sections_seen: 4,
				sections_added: 4,
				sections_modified: 0,
			},
			message: "Dataset processing complete",
		});
	});
	it("GET /api/v1/datasets{id} for completed upload of valid dataset w/ multiple courses responds with status OK and stats, 1 file skipped", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/upload_data2.zip");
		const dataset = await request(app)
			.post("/api/v1/datasets")
			.field("kind", "course_offerings")
			.attach("archive", datasetBuffer, "courses.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000)); // written using information from https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
		const res = await request(app).get(`/api/v1/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "completed",
			kind: "course_offerings",
			stats: {
				files_total: 5,
				files_processed: 4,
				files_skipped: 1,
				courses_seen: 4,
				courses_added: 4,
				courses_modified: 0,
				sections_seen: 7,
				sections_added: 7,
				sections_modified: 0,
			},
			message: "Dataset processing complete",
		});
	});

	it("GET /api/v1/datasets{id} for invalid zip file should respond with status OK and failed upload msg", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/query_data.json");
		const dataset = await request(app)
			.post("/api/v1/datasets")
			.field("kind", "course_offerings")
			.attach("archive", datasetBuffer, "courses.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000)); // written using information from https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
		const res = await request(app).get(`/api/v1/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "failed",
			kind: "course_offerings",
			stats: {
				files_total: 0,
				files_processed: 0,
				files_skipped: 0,
				courses_seen: 0,
				courses_added: 0,
				courses_modified: 0,
				sections_seen: 0,
				sections_added: 0,
				sections_modified: 0,
			},
			message: "Data is not in a valid zip format",
		});
	});

	it("GET /api/v1/datasets{id} for invalid zip file should respond with status OK and failed upload msg", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/upload_data_no_root_dir.zip");
		const dataset = await request(app)
			.post("/api/v1/datasets")
			.field("kind", "course_offerings")
			.attach("archive", datasetBuffer, "courses.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000)); // written using information from https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout

		const res = await request(app).get(`/api/v1/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "failed",
			kind: "course_offerings",
			message: "Missing root courses directory",
			stats: {
				files_total: 0,
				files_processed: 0,
				files_skipped: 0,
				courses_seen: 0,
				courses_added: 0,
				courses_modified: 0,
				sections_seen: 0,
				sections_added: 0,
				sections_modified: 0,
			},
		});
	});

	it("GET /api/v1/datasets/{id} for non-existent dataset id should respond with status NOT FOUND and error msg", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/upload_data1.zip");
		await request(app)
			.post("/api/v1/datasets")
			.field("kind", "course_offerings")
			.attach("archive", datasetBuffer, "courses.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000)); // written using information from https://stackoverflow.com/questions/33289726/combination-of-async-function-await-settimeout
		const res = await request(app).get("/api/v1/datasets/upload");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no dataset with id 'upload'",
		});
	});
});

describe("REST API v2 POST /api/v2/datasets - Facilities", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("POST /api/v2/datasets with invalid or missing kind should return 422 error", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/campus_5_buildings.zip");

		// INVALID
		const invalidKindRes = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "FAKE_KIND")
			.attach("archive", datasetBuffer, "campus.zip");
		expect(invalidKindRes.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(invalidKindRes.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "expected to be course_offerings or facilities",
			},
		});

		// MISSING
		const missingKindRes = await request(app).post("/api/v2/datasets").attach("archive", datasetBuffer, "campus.zip");
		expect(missingKindRes.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(missingKindRes.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "required but missing",
			},
		});
	});

	it("POST /api/v2/datasets with empty or missing archive should return 422 error", async () => {
		const missingArchiveRes = await request(app).post("/api/v2/datasets").field("kind", "facilities");
		expect(missingArchiveRes.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(missingArchiveRes.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				archive: "required but missing",
			},
		});

		const emptyZip = await fs.readFile("test/test_data/upload_data_empty.zip");
		const emptyArchiveRes = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", emptyZip, "campus.zip");
		expect(emptyArchiveRes.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(emptyArchiveRes.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				archive: "expected non-empty file",
			},
		});
	});

	it("POST /api/v2/datasets with valid fields and zip file should respond with ACCEPTED", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/campus_5_buildings.zip");
		const res = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		expect(res.status).to.equal(ACCEPTED);
		expect(res.body).to.deep.equal({
			id: res.body.id,
			status: "processing",
			kind: "facilities",
			message: "Dataset accepted for processing",
		});
	});

	it("POST /api/v2/datasets with valid fields and INVALID file should respond with ACCEPTED (fails later)", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/upload_data1.zip");
		const res = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		expect(res.status).to.equal(ACCEPTED);
		expect(res.body).to.deep.equal({
			id: res.body.id,
			status: "processing",
			kind: "facilities",
			message: "Dataset accepted for processing",
		});
	});

	it("GET /api/v2/datasets/{id} returns NOT_FOUND if job id doesn't exist", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/campus_5_buildings.zip");
		await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const res = await request(app).get("/api/v2/datasets/nonexistent");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no dataset with id 'nonexistent'",
		});
	});

	it("GET /api/v2/datasets/{id} returns status=failed if data is not in a valid zip format", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/random_file.json");
		const dataset = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const res = await request(app).get(`/api/v2/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "failed",
			kind: "facilities",
			message: "Data is not in a valid zip format",
			stats: {
				buildings_added: 0,
				buildings_modified: 0,
				rooms_added: 0,
				rooms_modified: 0,
			},
		});
	});

	it("GET /api/v2/datasets/{id} returns status=failed if index.htm is missing", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/campus_index.htm_missing.zip");
		const dataset = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const res = await request(app).get(`/api/v2/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "failed",
			kind: "facilities",
			message: "Missing index.htm file",
			stats: {
				buildings_added: 0,
				buildings_modified: 0,
				rooms_added: 0,
				rooms_modified: 0,
			},
		});
	});

	it("GET /api/v2/datasets/{id} returns status=failed if index.htm isn't valid HTML", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/campus_index.htm_invalid.zip");
		const dataset = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const res = await request(app).get(`/api/v2/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "failed",
			kind: "facilities",
			message: "index.htm could not be parsed",
			stats: {
				buildings_added: 0,
				buildings_modified: 0,
				rooms_added: 0,
				rooms_modified: 0,
			},
		});
	});

	it("GET /api/v2/datasets/{id} returns status=failed if index.htm missing building table", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/campus_index.htm_no_building_table.zip");
		const dataset = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const res = await request(app).get(`/api/v2/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "failed",
			kind: "facilities",
			message: "No building table found in index.htm",
			stats: {
				buildings_added: 0,
				buildings_modified: 0,
				rooms_added: 0,
				rooms_modified: 0,
			},
		});
	});

	it("GET /api/v2/datasets/{id} returns correct stats if zip file is completely valid", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/campus_5_buildings.zip");
		const dataset = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const res = await request(app).get(`/api/v2/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "completed",
			kind: "facilities",
			message: "Dataset processing complete",
			stats: {
				buildings_added: 5,
				buildings_modified: 0,
				rooms_added: 10,
				rooms_modified: 0,
			},
		});
	});

	it("GET /api/v2/datasets/{id} returns correct stats for full campus.zip", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/campus.zip");
		const dataset = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		await new Promise((resolve) => setTimeout(resolve, 2000));
		const res = await request(app).get(`/api/v2/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "completed",
			kind: "facilities",
			message: "Dataset processing complete",
			stats: {
				buildings_added: 74,
				buildings_modified: 0,
				rooms_added: 364,
				rooms_modified: 0,
			},
		});
	});

	it("GET /api/v2/datasets/{id} returns correct stats if zip file contains some corrupted data", async () => {
		const datasetBuffer = await fs.readFile("test/test_data/campus_partial_corrupted.zip");
		const dataset = await request(app)
			.post("/api/v2/datasets")
			.field("kind", "facilities")
			.attach("archive", datasetBuffer, "campus.zip");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const res = await request(app).get(`/api/v2/datasets/${dataset.body.id}`);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: dataset.body.id,
			status: "completed",
			kind: "facilities",
			message: "Dataset processing complete",
			stats: {
				buildings_added: 4,
				buildings_modified: 0,
				rooms_added: 9,
				rooms_modified: 0,
			},
		});
	});
});

describe("REST API v2 /api/v2/buildings/{buildings}", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("PUT /api/v2/buildings/DMP responds with status 201 and body with building", async () => {
		const res = await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		expect(res.status).to.equal(CREATED);
		expect(res.body).to.deep.equal({
			id: "DMP",
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
			links: {
				self: "/api/v2/buildings/DMP",
				rooms: "/api/v2/buildings/DMP/rooms",
			},
		});
	});

	it("PUT /api/v2/buildings/DMP responds with status 204 and no body", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "HDP",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		const res = await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		expect(res.status).to.equal(NO_CONTENT);
	});
	it("PUT /api/v2/buildings/DMP responds with status 422 and validation error body", async () => {
		const res = await request(app).put("/api/v2/buildings/DMP").send({
			address: "6245 Agronomy Road V6T 1Z4",
			lat: "49.26125",
			lon: -123.24807,
		});
		expect(res.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				name: "required but missing",
				lat: "expected a number",
			},
		});
	});
	it("GET /api/v2/buildings/DMP responds with status OK/200 and body with DMP building info", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		const res = await request(app).get("/api/v2/buildings/DMP");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: "DMP",
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
			links: {
				self: "/api/v2/buildings/DMP",
				rooms: "/api/v2/buildings/DMP/rooms",
			},
		});
	});
	it("GET /api/v2/buildings/DMP responds with status NOT_FOUND/404 and body error - no buildings added", async () => {
		const res = await request(app).get("/api/v2/buildings/DMP");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no building with id 'DMP'",
		});
	});

	it("GET /api/v2/buildings/DPM responds with status NOT_FOUND/404 and body error - wrong id", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		const res = await request(app).get("/api/v2/buildings/DPM");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no building with id 'DPM'",
		});
	});

	it("DELETE /api/v2/buildings/DMP responds with status OK and body with DMP info", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_201").send({
			building: "DMP",
			number: "201",
			type: "Small Group",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201",
			seats: 25,
		});
		const res = await request(app).delete("/api/v2/buildings/DMP");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: "DMP",
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
			rooms: 2, // note that add rooms need to be implemented for this part
		});
	});
	it("DELETE /api/v2/buildings/DMP responds with status not found and body error", async () => {
		const res = await request(app).delete("/api/v2/buildings/DMP");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no building with id 'DMP'",
		});
	});
});

describe("REST API v2 /api/v2/buildings", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("GET /api/v2/buildings responds with status OK and body with 0 buildings - offset", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/FSC").send({
			name: "Forestry Sciences Centre",
			address: "2424 Main Mall",
			lat: 49.260894,
			lon: -123.248092,
		});
		const res = await request(app).get("/api/v2/buildings?offset=2");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 2,
			limit: 100,
			offset: 2,
			items: [],
		});
	});
	it("GET /api/v2/buildings responds with status OK/200 and body with 4 buildings", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/FSC").send({
			name: "Forestry Sciences Centre",
			address: "2424 Main Mall",
			lat: 49.260894,
			lon: -123.248092,
		});
		await request(app).put("/api/v2/buildings/CEME").send({
			name: "Civil and Mechanical Engineering",
			address: "6250 Applied Science Lane",
			lat: 49.26261,
			lon: -123.249116,
		});
		await request(app).put("/api/v2/buildings/ORCH").send({
			name: "Orchard Commons",
			address: "6363 Agronomy Road",
			lat: 49.26048,
			lon: -123.25027,
		});
		const res = await request(app).get("/api/v2/buildings");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 4,
			limit: 100,
			offset: 0,
			items: [
				{
					id: "CEME",
					name: "Civil and Mechanical Engineering",
					address: "6250 Applied Science Lane",
					lat: 49.26261,
					lon: -123.249116,
					links: {
						self: "/api/v2/buildings/CEME",
						rooms: "/api/v2/buildings/CEME/rooms",
					},
				},
				{
					id: "DMP",
					name: "Hugh Dempster Pavilion",
					address: "6245 Agronomy Road V6T 1Z4",
					lat: 49.26125,
					lon: -123.24807,
					links: {
						self: "/api/v2/buildings/DMP",
						rooms: "/api/v2/buildings/DMP/rooms",
					},
				},
				{
					id: "FSC",
					name: "Forestry Sciences Centre",
					address: "2424 Main Mall",
					lat: 49.260894,
					lon: -123.248092,
					links: {
						self: "/api/v2/buildings/FSC",
						rooms: "/api/v2/buildings/FSC/rooms",
					},
				},
				{
					id: "ORCH",
					name: "Orchard Commons",
					address: "6363 Agronomy Road",
					lat: 49.26048,
					lon: -123.25027,
					links: {
						self: "/api/v2/buildings/ORCH",
						rooms: "/api/v2/buildings/ORCH/rooms",
					},
				},
			],
		});
	});

	it("GET /api/v2/buildings responds with status OK and empty body - no buildings", async () => {
		const res = await request(app).get("/api/v2/buildings");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 0,
			limit: 100,
			offset: 0,
			items: [],
		});
	});

	it("GET /api/v2/buildings responds with status BAD REQUEST/400 and error msg", async () => {
		const res = await request(app).get("/api/v2/buildings?limit=abc&offset=-1");
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
				offset: "expected an integer >= 0",
			},
		});
	});
});

describe("REST API v2 /api/v2/buildings/{building}/rooms/{room}", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("PUT /api/v2/buildings/DMP/rooms/DMP_101 responds with status CREATED/201 and body with room info", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		const res = await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		expect(res.status).to.equal(CREATED);
		expect(res.body).to.deep.equal({
			id: "DMP_101",
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
			links: {
				self: "/api/v2/buildings/DMP/rooms/DMP_101",
				building: "/api/v2/buildings/DMP",
			},
		});
	});

	it("PUT /api/v2/buildings/DMP/rooms/DMP_101 responds with status NO CONTENT/204", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 0,
		});
		const res = await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		expect(res.status).to.equal(NO_CONTENT);
	});

	it("PUT /api/v2/buildings/DMP/rooms/DMP_101 responds with status NOT FOUND/404 and error msg", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		const res = await request(app).put("/api/v2/buildings/DPM/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no building with id 'DPM'",
		});
	});

	it("PUT /api/v2/buildings/DMP/rooms/DMP_101 responds with status UNPROCESSIBLE ENTITY/422 and error msg", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		const res = await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DPM",
			number: 101,
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: -5,
		});
		expect(res.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				building: "must match parent building in path",
				number: "expected a string",
				type: "required but missing",
				seats: "expected a number >= 0",
			},
		});
	});

	it("GET /api/v2/buildings/DMP/rooms/DMP_101 responds with status OK and body with room info", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		const res = await request(app).get("/api/v2/buildings/DMP/rooms/DMP_101");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: "DMP_101",
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
			links: {
				self: "/api/v2/buildings/DMP/rooms/DMP_101",
				building: "/api/v2/buildings/DMP",
			},
		});
	});

	it("GET /api/v2/buildings/DMP/rooms/DMP_101 responds with status NOT FOUND and error msg", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		const res = await request(app).get("/api/v2/buildings/DMP/rooms/DMP_102");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no room with id 'DMP_102'",
		});
	});

	it("DELETE /api/v2/buildings/DMP/rooms/DMP_101 responds with status OK/200 and body w/ room info", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		const res = await request(app).delete("/api/v2/buildings/DMP/rooms/DMP_101");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			id: "DMP_101",
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
	});
	it("DELETE /api/v2/buildings/DMP/rooms/DMP_101 responds with status not found and error msg", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		const res = await request(app).delete("/api/v2/buildings/DMP/rooms/DMP_101");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no room with id 'DMP_101'",
		});
	});
});

describe("REST API v2 /api/v2/buildings/{building}/rooms", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("GET /api/v2/buildings/DMP/rooms responds with status OK and list of rooms", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_201").send({
			building: "DMP",
			number: "201",
			type: "Small Group",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201",
			seats: 25,
		});
		const res = await request(app).get("/api/v2/buildings/DMP/rooms");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 2,
			limit: 100,
			offset: 0,
			items: [
				{
					id: "DMP_101",
					building: "DMP",
					number: "101",
					type: "Open Design General Purpose",
					furniture: "Classroom-Movable Tables & Chairs",
					href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
					seats: 40,
					links: {
						self: "/api/v2/buildings/DMP/rooms/DMP_101",
						building: "/api/v2/buildings/DMP",
					},
				},
				{
					id: "DMP_201",
					building: "DMP",
					number: "201",
					type: "Small Group",
					furniture: "Classroom-Movable Tables & Chairs",
					href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201",
					seats: 25,
					links: {
						self: "/api/v2/buildings/DMP/rooms/DMP_201",
						building: "/api/v2/buildings/DMP",
					},
				},
			],
		});
	});

	it("GET /api/v2/buildings/DMP/rooms with query params responds with status OK and empty list", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_201").send({
			building: "DMP",
			number: "201",
			type: "Small Group",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201",
			seats: 25,
		});
		const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=10&offset=2");
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal({
			total: 2,
			limit: 10,
			offset: 2,
			items: [],
		});
	});
	it("GET /api/v2/buildings/DMP/rooms responds with BAD REQUEST/400 and error msg", async () => {
		await request(app).put("/api/v2/buildings/DMP").send({
			name: "Hugh Dempster Pavilion",
			address: "6245 Agronomy Road V6T 1Z4",
			lat: 49.26125,
			lon: -123.24807,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_101").send({
			building: "DMP",
			number: "101",
			type: "Open Design General Purpose",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-101",
			seats: 40,
		});
		await request(app).put("/api/v2/buildings/DMP/rooms/DMP_201").send({
			building: "DMP",
			number: "201",
			type: "Small Group",
			furniture: "Classroom-Movable Tables & Chairs",
			href: "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/DMP-201",
			seats: 25,
		});
		const res = await request(app).get("/api/v2/buildings/DMP/rooms?limit=abc&offset=-2");
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid request parameters",
			params: {
				limit: "expected an integer between 1 and 5000",
				offset: "expected an integer >= 0",
			},
		});
	});

	it("GET /api/v2/buildings/DMP/rooms responds with status NOT FOUND/404 and error msg", async () => {
		const res = await request(app).get("/api/v2/buildings/DMP/rooms");
		expect(res.status).to.equal(NOT_FOUND);
		expect(res.body).to.deep.equal({
			error: "Not found",
			message: "no building with id 'DMP'",
		});
	});
});

describe("REST API v2 /api/v2/search - Courses", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
		const store = createFileStore(datadir);
		await seedCollection(store, "courses", "test/test_data/query_data.json");
		// cannot comment in JSON files, but data in query_data.json was generated by Gemini
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("POST /api/v2/search with a basic query should respond with status 200 and course offerings with an average over 80 - sorted in down dir by avg", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					GT: {
						avg: 80,
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: {
						dir: "DOWN",
						keys: ["avg"],
					},
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		// below response generated by Gemini
		expect(res.body).to.deep.equal([
			{ dept: "phys", avg: 91.0 },
			{ dept: "cpsc", avg: 89.2 },
			{ dept: "engl", avg: 88.7 },
			{ dept: "cpsc", avg: 88.5 },
			{ dept: "cpsc", avg: 85.3 },
			{ dept: "psyc", avg: 85.0 },
			{ dept: "biol", avg: 84.1 },
			{ dept: "phys", avg: 82.5 },
			{ dept: "psyc", avg: 81.4 },
		]);
		// above code generated by Gemini
	});
	it("POST /api/v2/search with a basic query for courses should respond with status 200 - transform to find avg of each course", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					IS: {
						dept: "cpsc",
					},
				},
				OPTIONS: {
					COLUMNS: ["title", "overallAvg"],
					ORDER: "title",
				},
				TRANSFORMATIONS: {
					GROUP: ["title"],
					APPLY: [
						{
							overallAvg: {
								AVG: "avg",
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([
			{ title: "Software Construction", overallAvg: 88.85 },
			{ title: "Software Engineering", overallAvg: 81.7 },
		]);
	});

	it("POST /api/v2/search with a basic query for courses should respond with status 200 and an empty array (no courses match filter)", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					GT: {
						avg: 99,
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([]);
	});

	it("POST /api/v2/search with a basic query for courses should respond with status 413 and error msg)", async () => {
		await seedCollection(createFileStore(datadir), "courses", "test/test_data/large_course_data.json");
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["dept", "title", "avg"],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(REQUEST_TOO_LONG);
		expect(res.body).to.deep.equal({
			error: "Too many results",
			message: "Query would return more than 5000 results",
			limit: 5000,
		});
	});

	it("POST /api/v2/search with a basic query for courses with missing parameters should respond with status 400", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "Missing WHERE",
		});
		const query2 = {
			kind: "course_offerings",
			query: {
				WHERE: {
					IS: {
						dept: "apsc",
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "overallAvg",
				},
			},
		};
		const res2 = await request(app).post("/api/v2/search").send(query2);
		expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid query",
			message: "ORDER must be a key in COLUMNS",
		});
		const query3 = {
			kind: "course_offerings",
			query: {
				WHERE: {
					IS: {
						dept: "apsc",
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "overall_avg"],
					ORDER: "overall_avg",
				},
				TRANSFORMATIONS: {
					GROUP: ["dept"],
					APPLY: [
						{
							overall_avg: {
								AVG: "avg",
							},
						},
					],
				},
			},
		};
		const res3 = await request(app).post("/api/v2/search").send(query3);
		expect(res3.status).to.equal(BAD_REQUEST);
		expect(res3.body).to.deep.equal({
			error: "Invalid query",
			message: "applykey cannot be empty or contain underscore",
		});
		const query4 = {
			kind: "course_offerings",
			query: {
				WHERE: {
					OR: [
						{
							IS: {
								dept: "apsc",
							},
						},
						{
							IS: {
								type: "Open Design General Purpose",
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg", "address", "type"],
				},
			},
		};
		const res4 = await request(app).post("/api/v2/search").send(query4);
		expect(res4.status).to.equal(BAD_REQUEST);
		expect(res4.body).to.deep.equal({
			error: "Invalid query",
			message: "Cannot mix course_offerings and facilities fields in one query",
		});
	});

	it("POST /api/v2/search for basic search with invalid or missing query/kind for courses should respond with status 422", async () => {
		const query1 = {
			query: {
				WHERE: {
					GT: {
						avg: 80,
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};

		const res1 = await request(app).post("/api/v2/search").send(query1);
		expect(res1.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res1.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "required but missing",
			},
		});

		const query2 = {
			kind: "courses",
		};

		const res2 = await request(app).post("/api/v2/search").send(query2);
		expect(res2.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res2.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "expected to be course_offerings or facilities",
				query: "required but missing",
			},
		});

		const query3 = {
			kind: "course_offerings",
			query: 12,
		};
		const res3 = await request(app).post("/api/v2/search").send(query3);
		expect(res3.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res3.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				query: "expected an object",
			},
		});
	});

	it("POST /api/v2/search for a complex search should respond with status 200 and 5 course offerings - order by title then year descending ", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 70,
									},
								},
								{
									IS: {
										dept: "cpsc",
									},
								},
							],
						},
						{
							EQ: {
								year: 2021,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["dept", "title", "year", "avg"],
					ORDER: {
						dir: "DOWN",
						keys: ["title", "year", "avg"],
					},
				},
			},
		};

		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		// below code generated by Copilot
		expect(res.body).to.deep.equal([
			{ dept: "cpsc", title: "Software Engineering", year: 2021, avg: 78.1 },
			{ dept: "cpsc", title: "Software Engineering", year: 2020, avg: 85.3 },
			{ dept: "cpsc", title: "Software Construction", year: 2020, avg: 89.2 },
			{ dept: "cpsc", title: "Software Construction", year: 2019, avg: 88.5 },
			{ dept: "econ", title: "Principles of Microeconomics", year: 2021, avg: 70.2 },
			{ dept: "psyc", title: "Introductory Psychology", year: 2021, avg: 85.0 },
			{ dept: "phys", title: "Introduction to Physics", year: 2021, avg: 91.0 },
			{ dept: "phys", title: "Introduction to Physics", year: 2021, avg: 82.5 },
		]);
		// above code written with Copilot
	});

	it("POST /api/v2/search for a complex search should respond with status 200 and an empty array (no courses meet req.)", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 90,
									},
								},
								{
									IS: {
										dept: "adhe",
									},
								},
							],
						},
						{
							EQ: {
								avg: 95,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([]);
	});

	it("POST /api/v2/search with a complex query with missing parameters should respond with status 400", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 90,
									},
								},
								{
									IS: {
										dept: "adhe",
									},
								},
							],
						},
						{
							EQ: {
								avg: 95,
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "Missing OPTIONS",
		});
		const query2 = {
			kind: "course_offerings",
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 90,
									},
								},
								{
									IS: {
										dept: "adhe",
										code: "344",
									},
								},
							],
						},
						{
							EQ: {
								avg: 95,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg", "time"],
					ORDER: "avg",
				},
			},
		};
		const res2 = await request(app).post("/api/v2/search").send(query2);
		expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid query",
			message: "Unknown key in COLUMNS",
		});
	});
	it("POST /api/v2/search for complex search with invalid or missing query/kind should respond with status 422", async () => {
		const query1 = {
			query: {
				WHERE: {
					OR: [
						{
							AND: [
								{
									GT: {
										avg: 90,
									},
								},
								{
									IS: {
										dept: "adhe",
									},
								},
							],
						},
						{
							EQ: {
								avg: 95,
							},
						},
					],
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: "avg",
				},
			},
		};

		const res1 = await request(app).post("/api/v2/search").send(query1);
		expect(res1.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res1.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "required but missing",
			},
		});

		const query2 = {
			kind: "courses",
			query: 12,
		};

		const res2 = await request(app).post("/api/v2/search").send(query2);
		expect(res2.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res2.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "expected to be course_offerings or facilities",
				query: "expected an object",
			},
		});
	});

	// below written by claude
	it("POST /api/v2/search with NOT filter should return all non-cpsc courses", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					NOT: {
						IS: {
							dept: "cpsc",
						},
					},
				},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: {
						dir: "UP",
						keys: ["avg"],
					},
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([
			{ dept: "math", avg: 65.4 },
			{ dept: "psyc", avg: 68.9 },
			{ dept: "econ", avg: 70.2 },
			{ dept: "engl", avg: 72.0 },
			{ dept: "math", avg: 74.2 },
			{ dept: "biol", avg: 76.8 },
			{ dept: "econ", avg: 79.5 },
			{ dept: "psyc", avg: 81.4 },
			{ dept: "phys", avg: 82.5 },
			{ dept: "biol", avg: 84.1 },
			{ dept: "psyc", avg: 85.0 },
			{ dept: "engl", avg: 88.7 },
			{ dept: "phys", avg: 91.0 },
		]);
	});

	it("POST /api/v2/search with empty WHERE should return all courses", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["dept", "avg"],
					ORDER: {
						dir: "UP",
						keys: ["avg"],
					},
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.have.length(17);
		expect(res.body[0]).to.deep.equal({ dept: "math", avg: 65.4 });
		expect(res.body[16]).to.deep.equal({ dept: "phys", avg: 91.0 });
	});

	it("POST /api/v2/search with TRANSFORMATIONS using COUNT on sfield should return grouped counts", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {
					IS: {
						dept: "cpsc",
					},
				},
				OPTIONS: {
					COLUMNS: ["title", "numSections"],
					ORDER: "title",
				},
				TRANSFORMATIONS: {
					GROUP: ["title"],
					APPLY: [
						{
							numSections: {
								COUNT: "instructor",
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([
			{ title: "Software Construction", numSections: 1 },
			{ title: "Software Engineering", numSections: 2 },
		]);
	});

	it("POST /api/v2/search with COLUMNS not in GROUP or APPLY should return 400", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["dept", "title", "overallAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["title"],
					APPLY: [
						{
							overallAvg: {
								AVG: "avg",
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "When TRANSFORMATIONS is present, all COLUMNS must be in GROUP or APPLY",
		});
	});

	it("POST /api/v2/search with duplicate applykey should return 400", async () => {
		const query = {
			kind: "course_offerings",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["dept", "maxAvg", "minAvg"],
				},
				TRANSFORMATIONS: {
					GROUP: ["dept"],
					APPLY: [
						{
							maxAvg: {
								MAX: "avg",
							},
						},
						{
							maxAvg: {
								MIN: "avg",
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "Duplicate applykey in APPLY",
		});
	});
	// above written by claude
});

describe("REST API v2 /api/v2/search - Facilities", function () {
	let app: Application;

	beforeEach(async () => {
		app = await createApp({ datadir });
		await seedCollection(createFileStore(datadir), "buildings", "test/test_data/partial_building_data.json");
	});

	afterEach(async () => {
		await fs.rm(datadir, { recursive: true, force: true });
	});

	it("POST /api/v2/search with a basic query should respond with status 200 and facilities results", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {
					GT: {
						seats: 80,
					},
				},
				OPTIONS: {
					COLUMNS: ["building", "number", "seats"],
					ORDER: {
						dir: "DOWN",
						keys: ["seats", "building"],
					},
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([
			{
				building: "CHBE",
				number: "101",
				seats: 200,
			},
			{
				building: "CHBE",
				number: "102",
				seats: 94,
			},
			{
				building: "ALRD",
				number: "105",
				seats: 94,
			},
		]);
	});

	it("POST /api/v2/search with a basic query should respond with status 200 and empty array", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {
					GT: {
						seats: 1600,
					},
				},
				OPTIONS: {
					COLUMNS: ["building", "number", "seats"],
					ORDER: {
						dir: "DOWN",
						keys: ["seats"],
					},
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([]);
	});

	it("POST /api/v2/search with a basic query responds with status 400 - invalid EBNF", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {
					EQ: {
						type: "Open Design General Purpose",
					},
				},
				OPTIONS: {
					COLUMNS: ["address", "type"],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "EQ must be an object with one mfield of type number",
		});

		const query2 = {
			kind: "facilities",
			query: {
				WHERE: {
					GT: {
						seats: 60,
					},
				},
				OPTIONS: {
					COLUMNS: ["building", "number", "seats"],
					ORDER: {
						dir: "LEFT",
						keys: ["seats"],
					},
				},
			},
		};
		const res2 = await request(app).post("/api/v2/search").send(query2);
		expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid query",
			message: "Invalid sort direction (must be UP or DOWN)",
		});
	});

	it("POST /api/v2/search with a basic query responds with status 413 - too many results", async () => {
		await seedCollection(createFileStore(datadir), "buildings", "test/test_data/large_building_data.json");
		const query = {
			kind: "facilities",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["address", "seats"],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(REQUEST_TOO_LONG);
		expect(res.body).to.deep.equal({
			error: "Too many results",
			message: "Query would return more than 5000 results",
			limit: 5000,
		});
	});

	it("POST /api/v2/search with a basic query responds with status 422 - validation error", async () => {
		const query1 = {
			query: {
				WHERE: {
					GT: {
						seats: 80,
					},
				},
				OPTIONS: {
					COLUMNS: ["address", "building"],
					ORDER: "address",
				},
			},
		};

		const res1 = await request(app).post("/api/v2/search").send(query1);
		expect(res1.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res1.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "required but missing",
			},
		});

		const query2 = {
			kind: "buildings",
			query: {
				WHERE: {
					GT: {
						seats: 80,
					},
				},
				OPTIONS: {
					COLUMNS: ["address", "building"],
					ORDER: "address",
				},
			},
		};

		const res2 = await request(app).post("/api/v2/search").send(query2);
		expect(res2.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res2.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				kind: "expected to be course_offerings or facilities",
			},
		});

		const query3 = {
			kind: "facilities",
			query: 12,
		};
		const res3 = await request(app).post("/api/v2/search").send(query3);
		expect(res3.status).to.equal(UNPROCESSABLE_ENTITY);
		expect(res3.body).to.deep.equal({
			error: "Validation failed",
			fields: {
				query: "expected an object",
			},
		});
	});

	it("POST /api/v2/search with a complex query responds with status 200 and facilities results", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {
					IS: {
						building: "A*",
					},
				},
				OPTIONS: {
					COLUMNS: ["building", "minSeats"],
					ORDER: {
						dir: "DOWN",
						keys: ["minSeats", "building"],
					},
				},
				TRANSFORMATIONS: {
					GROUP: ["building"],
					APPLY: [
						{
							minSeats: {
								MIN: "seats",
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([
			{
				building: "ALRD",
				minSeats: 20,
			},
		]);
	});

	it("POST /api/v2/search with a complex query responds with status 400 - invalid parameters for facilities", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {
					IS: {
						building: "A*",
					},
				},
				OPTIONS: {
					COLUMNS: ["building", "minNumber"],
					ORDER: {
						dir: "DOWN",
						keys: ["minNumber", "building"],
					},
				},
				TRANSFORMATIONS: {
					GROUP: ["building"],
					APPLY: [
						{
							minNumber: {
								MIN: "number",
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "MAX/MIN/AVG/SUM can only be applied to mfields",
		});
		const query2 = {
			kind: "facilities",
			query: {
				WHERE: {
					IS: {
						building: "A*",
					},
				},
				OPTIONS: {
					COLUMNS: ["building", "minNumber"],
					ORDER: {
						dir: "DOWN",
						keys: ["minNumber", "building"],
					},
				},
				TRANSFORMATIONS: {
					GROUP: ["building"],
					APPLY: [
						{
							minNumber: {
								SIZE: "number",
							},
						},
					],
				},
			},
		};
		const res2 = await request(app).post("/api/v2/search").send(query2);
		expect(res2.status).to.equal(BAD_REQUEST);
		expect(res2.body).to.deep.equal({
			error: "Invalid query",
			message: "Invalid APPLYTOKEN (must be MAX, MIN, AVG, COUNT, or SUM)",
		});
	});

	// below written by claude
	it("POST /api/v2/search with NOT filter should return rooms with seats <= 80", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {
					NOT: {
						GT: {
							seats: 80,
						},
					},
				},
				OPTIONS: {
					COLUMNS: ["building", "number", "seats"],
					ORDER: {
						dir: "UP",
						keys: ["seats", "number"],
					},
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([
			{ building: "ALRD", number: "112", seats: 20 },
			{ building: "ALRD", number: "113", seats: 20 },
			{ building: "ALRD", number: "B101", seats: 44 },
			{ building: "ALRD", number: "121", seats: 50 },
			{ building: "CHBE", number: "103", seats: 60 },
		]);
	});

	it("POST /api/v2/search with empty WHERE should return all facility rooms", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["building", "seats"],
					ORDER: {
						dir: "UP",
						keys: ["seats"],
					},
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.have.length(8);
		expect(res.body[0]).to.deep.equal({ building: "ALRD", seats: 20 });
		expect(res.body[7]).to.deep.equal({ building: "CHBE", seats: 200 });
	});

	it("POST /api/v2/search with TRANSFORMATIONS using COUNT on sfield should return grouped counts", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["building", "numTypes"],
					ORDER: "building",
				},
				TRANSFORMATIONS: {
					GROUP: ["building"],
					APPLY: [
						{
							numTypes: {
								COUNT: "type",
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(OK);
		expect(res.body).to.deep.equal([
			{ building: "ALRD", numTypes: 2 },
			{ building: "CHBE", numTypes: 2 },
		]);
	});

	it("POST /api/v2/search with COLUMNS not in GROUP or APPLY should return 400", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["building", "number", "maxSeats"],
				},
				TRANSFORMATIONS: {
					GROUP: ["building"],
					APPLY: [
						{
							maxSeats: {
								MAX: "seats",
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "When TRANSFORMATIONS is present, all COLUMNS must be in GROUP or APPLY",
		});
	});

	it("POST /api/v2/search with duplicate applykey should return 400", async () => {
		const query = {
			kind: "facilities",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["building", "maxSeats"],
				},
				TRANSFORMATIONS: {
					GROUP: ["building"],
					APPLY: [
						{
							maxSeats: {
								MAX: "seats",
							},
						},
						{
							maxSeats: {
								MIN: "seats",
							},
						},
					],
				},
			},
		};
		const res = await request(app).post("/api/v2/search").send(query);
		expect(res.status).to.equal(BAD_REQUEST);
		expect(res.body).to.deep.equal({
			error: "Invalid query",
			message: "Duplicate applykey in APPLY",
		});
	});
	// above written by claude
});
