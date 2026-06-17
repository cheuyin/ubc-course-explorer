import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Repositories } from "../App";

const FIELD_DEFS: Record<string, { mfields: string[]; sfields: string[] }> = {
	course_offerings: {
		mfields: ["avg", "pass", "fail", "audit", "year"],
		sfields: ["dept", "instructor", "title", "code"],
	},
	facilities: {
		mfields: ["lat", "lon", "seats"],
		sfields: ["address", "building", "furniture", "href", "name", "number", "type"],
	},
};

const VALID_KINDS = Object.keys(FIELD_DEFS);

function isOtherKindField(field: string, kind: string): boolean {
	return Object.entries(FIELD_DEFS)
		.filter(([k]) => k !== kind)
		.some(([, def]) => def.mfields.includes(field) || def.sfields.includes(field));
}

type ValidationErrors = {
	error: string;
	fields: { [key: string]: string };
};

export type InvalidQueryError = {
	error: "Invalid query";
	message:
		| "Missing WHERE"
		| "Missing OPTIONS"
		| "Missing COLUMNS"
		| "Unknown key in COLUMNS"
		| "ORDER must be a key in COLUMNS"
		| "All ORDER keys must be in COLUMNS"
		| "Invalid sort direction (must be UP or DOWN)"
		| "WHERE must be an object with at most one FILTER"
		| "OPTIONS must be an object with COLUMNS and optional ORDER"
		| "AND must be a non-empty array of FILTER objects"
		| "OR must be a non-empty array of FILTER objects"
		| "NOT must be a FILTER object"
		| "LT must be an object with one mfield of type number"
		| "GT must be an object with one mfield of type number"
		| "EQ must be an object with one mfield of type number"
		| "IS must be an object with one sfield of type string"
		| "IS asterisks can only be first or last character"
		| "Cannot mix course_offerings and facilities fields in one query"
		| "Missing GROUP in TRANSFORMATIONS"
		| "Missing APPLY in TRANSFORMATIONS"
		| "GROUP must be a non-empty array"
		| "APPLY must be an array"
		| "When TRANSFORMATIONS is present, all COLUMNS must be in GROUP or APPLY"
		| "Invalid APPLYTOKEN (must be MAX, MIN, AVG, COUNT, or SUM)"
		| "MAX/MIN/AVG/SUM can only be applied to mfields"
		| "APPLYRULE must apply aggregation to a valid KEY"
		| "Duplicate applykey in APPLY"
		| "applykey cannot be empty or contain underscore";
};

type FlatRecord = {
	[key: string]: string | number;
};

const MAX_RESULTS = 5000;

// ===== 1. JSON Structural Validation =====

function validateJSON(body: any): ValidationErrors | null {
	const errors: ValidationErrors = { error: "Validation failed", fields: {} };

	if (!body || typeof body !== "object") {
		errors.fields.body = "required but missing";
		return errors;
	}

	if (!("kind" in body)) {
		errors.fields.kind = "required but missing";
	} else if (!VALID_KINDS.includes(body.kind)) {
		errors.fields.kind = "expected to be course_offerings or facilities";
	}

	if (!("query" in body)) {
		errors.fields.query = "required but missing";
	} else if (typeof body.query !== "object" || body.query === null) {
		errors.fields.query = "expected an object";
	}

	return Object.keys(errors.fields).length > 0 ? errors : null;
}

// ===== 2. EBNF Logic Validation =====

function validateEBNF(query: any, kind: string, mfields: string[], sfields: string[]): InvalidQueryError | null {
	if (!("WHERE" in query)) return createError("Missing WHERE");
	if (!("OPTIONS" in query)) return createError("Missing OPTIONS");

	let applyKeys: string[] = [];
	if ("TRANSFORMATIONS" in query) {
		const tErr = validateTransformations(query.TRANSFORMATIONS, kind, mfields, sfields);
		if (tErr) return createError(tErr);
		applyKeys = (query.TRANSFORMATIONS.APPLY as any[]).map((rule: any) => Object.keys(rule)[0]);
	}

	const optionsError = validateOptions(query.OPTIONS, kind, mfields, sfields, applyKeys);
	if (optionsError) return createError(optionsError);

	if ("TRANSFORMATIONS" in query) {
		const cols: string[] = query.OPTIONS.COLUMNS;
		const groupKeys: string[] = query.TRANSFORMATIONS.GROUP;
		for (const col of cols) {
			if (!groupKeys.includes(col) && !applyKeys.includes(col)) {
				return createError("When TRANSFORMATIONS is present, all COLUMNS must be in GROUP or APPLY");
			}
		}
	}

	const whereError = validateFilter(query.WHERE, kind, mfields, sfields);
	if (whereError) return createError(whereError);

	return null;
}

function createError(message: InvalidQueryError["message"]): InvalidQueryError {
	return { error: "Invalid query", message };
}

function validateOptions(
	options: any,
	kind: string,
	mfields: string[],
	sfields: string[],
	applyKeys: string[] = []
): InvalidQueryError["message"] | null {
	if (!options || typeof options !== "object" || Array.isArray(options)) {
		return "OPTIONS must be an object with COLUMNS and optional ORDER";
	}

	if (!("COLUMNS" in options)) return "Missing COLUMNS";

	const cols = options.COLUMNS;
	if (!Array.isArray(cols) || cols.length === 0) {
		return "OPTIONS must be an object with COLUMNS and optional ORDER";
	}

	for (const col of cols) {
		if (typeof col !== "string" || (!mfields.includes(col) && !sfields.includes(col) && !applyKeys.includes(col))) {
			if (typeof col === "string" && isOtherKindField(col, kind)) {
				return "Cannot mix course_offerings and facilities fields in one query";
			}
			return "Unknown key in COLUMNS";
		}
	}

	if ("ORDER" in options) {
		const order = options.ORDER;
		if (typeof order === "string") {
			if (!cols.includes(order)) {
				return "ORDER must be a key in COLUMNS";
			}
		} else if (typeof order === "object" && order !== null && !Array.isArray(order)) {
			if (order.dir !== "UP" && order.dir !== "DOWN") {
				return "Invalid sort direction (must be UP or DOWN)";
			}
			if (!Array.isArray(order.keys) || order.keys.length === 0) {
				return "All ORDER keys must be in COLUMNS";
			}
			for (const key of order.keys) {
				if (typeof key !== "string" || !cols.includes(key)) {
					return "All ORDER keys must be in COLUMNS";
				}
			}
		} else {
			return "ORDER must be a key in COLUMNS";
		}
	}

	return null;
}

const VALID_APPLY_TOKENS = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

function validateTransformations(
	t: any,
	kind: string,
	mfields: string[],
	sfields: string[]
): InvalidQueryError["message"] | null {
	if (!("GROUP" in t)) return "Missing GROUP in TRANSFORMATIONS";
	if (!("APPLY" in t)) return "Missing APPLY in TRANSFORMATIONS";
	if (!Array.isArray(t.GROUP) || t.GROUP.length === 0) return "GROUP must be a non-empty array";
	if (!Array.isArray(t.APPLY)) return "APPLY must be an array";

	const allKeys = [...mfields, ...sfields];
	for (const gKey of t.GROUP) {
		if (!allKeys.includes(gKey)) {
			if (isOtherKindField(gKey, kind)) return "Cannot mix course_offerings and facilities fields in one query";
			return "GROUP must be a non-empty array";
		}
	}

	const seenApplyKeys = new Set<string>();
	for (const rule of t.APPLY) {
		if (!rule || typeof rule !== "object" || Array.isArray(rule) || Object.keys(rule).length !== 1) {
			return "APPLYRULE must apply aggregation to a valid KEY";
		}
		const applyKey = Object.keys(rule)[0];
		if (applyKey === "" || applyKey.includes("_")) return "applykey cannot be empty or contain underscore";
		if (seenApplyKeys.has(applyKey)) return "Duplicate applykey in APPLY";
		seenApplyKeys.add(applyKey);

		const inner = rule[applyKey];
		if (!inner || typeof inner !== "object" || Array.isArray(inner) || Object.keys(inner).length !== 1) {
			return "APPLYRULE must apply aggregation to a valid KEY";
		}
		const token = Object.keys(inner)[0];
		if (!VALID_APPLY_TOKENS.includes(token)) return "Invalid APPLYTOKEN (must be MAX, MIN, AVG, COUNT, or SUM)";

		const targetKey = inner[token];
		if (typeof targetKey !== "string" || !allKeys.includes(targetKey)) {
			return "APPLYRULE must apply aggregation to a valid KEY";
		}
		if (token !== "COUNT" && !mfields.includes(targetKey)) {
			return "MAX/MIN/AVG/SUM can only be applied to mfields";
		}
	}

	return null;
}

function validateFilter(
	f: any,
	kind: string,
	mfields: string[],
	sfields: string[]
): InvalidQueryError["message"] | null {
	if (!f || typeof f !== "object" || Array.isArray(f)) return "WHERE must be an object with at most one FILTER";
	const keys = Object.keys(f);
	if (keys.length === 0) return null;
	if (keys.length > 1) return "WHERE must be an object with at most one FILTER";
	const [op, v] = [keys[0], f[keys[0]]];

	if (op === "AND" || op === "OR") {
		if (!Array.isArray(v) || v.length === 0) return `${op} must be a non-empty array of FILTER objects` as any;
		return v.map((sub: any) => validateFilter(sub, kind, mfields, sfields)).find((err: any) => err) || null;
	}
	if (op === "NOT") {
		if (!v || typeof v !== "object" || Array.isArray(v)) return "NOT must be a FILTER object";
		return validateFilter(v, kind, mfields, sfields);
	}
	if (["LT", "GT", "EQ"].includes(op)) {
		if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== 1)
			return `${op} must be an object with one mfield of type number` as any;
		const mKey = Object.keys(v)[0];
		if (!mfields.includes(mKey) || typeof v[mKey] !== "number") {
			if (isOtherKindField(mKey, kind)) return "Cannot mix course_offerings and facilities fields in one query";
			return `${op} must be an object with one mfield of type number` as any;
		}
		return null;
	}
	if (op === "IS") {
		if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== 1)
			return "IS must be an object with one sfield of type string";
		const sKey = Object.keys(v)[0];
		if (!sfields.includes(sKey) || typeof v[sKey] !== "string") {
			if (isOtherKindField(sKey, kind)) return "Cannot mix course_offerings and facilities fields in one query";
			return "IS must be an object with one sfield of type string";
		}
		return /^\*?[^*]*\*?$/.test(v[sKey]) ? null : "IS asterisks can only be first or last character";
	}
	return "WHERE must be an object with at most one FILTER";
}

// ===== 3. Execution & Filtering =====

function applyFilter(r: FlatRecord, f: any): boolean {
	const keys = Object.keys(f);
	if (keys.length === 0) return true;
	const [op, v] = [keys[0], f[keys[0]]];

	if (op === "AND") return v.every((sub: any) => applyFilter(r, sub));
	if (op === "OR") return v.some((sub: any) => applyFilter(r, sub));
	if (op === "NOT") return !applyFilter(r, v);

	const [key, qVal] = [Object.keys(v)[0], v[Object.keys(v)[0]]];
	const rVal = r[key];

	if (op === "LT") return (rVal as number) < (qVal as number);
	if (op === "GT") return (rVal as number) > (qVal as number);
	if (op === "EQ") return (rVal as number) === (qVal as number);
	if (op === "IS") {
		const str = qVal as string;
		if (str === "*" || str === "**") return true;
		if (str.startsWith("*") && str.endsWith("*")) return (rVal as string).includes(str.slice(1, -1));
		if (str.startsWith("*")) return (rVal as string).endsWith(str.slice(1));
		if (str.endsWith("*")) return (rVal as string).startsWith(str.slice(0, -1));
		return rVal === str;
	}
	return false;
}

async function getFlatRecords(kind: string, repos: Repositories): Promise<FlatRecord[]> {
	if (kind === "course_offerings") {
		const records: FlatRecord[] = [];
		for (const c of await repos.courses.getCourses()) {
			for (const s of c.sections) {
				records.push({ dept: c.dept, title: c.title, code: c.code, ...s });
			}
		}
		return records;
	}
	if (kind === "facilities") {
		const records: FlatRecord[] = [];
		for (const b of await repos.buildings.getBuildings()) {
			for (const r of b.rooms) {
				records.push({
					address: b.address,
					building: b.id,
					lat: b.lat,
					lon: b.lon,
					name: b.name,
					furniture: r.furnitureType,
					href: r.href,
					number: r.roomNumber,
					seats: r.seats,
					type: r.roomType,
				});
			}
		}
		return records;
	}
	return [];
}

function sortResults(records: FlatRecord[], order: string | { dir: string; keys: string[] } | undefined): void {
	if (!order) return;
	if (typeof order === "string") {
		records.sort((a, b) => (a[order] < b[order] ? -1 : a[order] > b[order] ? 1 : 0));
	} else {
		const direction = order.dir === "DOWN" ? -1 : 1;
		records.sort((a, b) => {
			for (const key of order.keys) {
				if (a[key] < b[key]) return -1 * direction;
				if (a[key] > b[key]) return 1 * direction;
			}
			return 0;
		});
	}
}

function applyTransformations(records: FlatRecord[], group: string[], apply: any[]): FlatRecord[] {
	const groups = new Map<string, FlatRecord[]>();
	for (const r of records) {
		const key = group.map((g) => String(r[g])).join("\0");
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(r);
	}

	const results: FlatRecord[] = [];
	for (const [, members] of groups) {
		const row: FlatRecord = {};
		for (const g of group) {
			row[g] = members[0][g];
		}
		for (const rule of apply) {
			const applyKey = Object.keys(rule)[0];
			const token = Object.keys(rule[applyKey])[0];
			const targetKey = rule[applyKey][token];
			const values = members.map((m) => m[targetKey]);

			if (token === "MAX") {
				row[applyKey] = Math.max(...(values as number[]));
			} else if (token === "MIN") {
				row[applyKey] = Math.min(...(values as number[]));
			} else if (token === "AVG") {
				const sum = (values as number[]).reduce((a, b) => a + b, 0);
				row[applyKey] = Number((sum / values.length).toFixed(2));
			} else if (token === "SUM") {
				row[applyKey] = Number((values as number[]).reduce((a, b) => a + b, 0).toFixed(2));
			} else if (token === "COUNT") {
				row[applyKey] = new Set(values).size;
			}
		}
		results.push(row);
	}
	return results;
}

function projectColumns(records: FlatRecord[], columns: string[]): FlatRecord[] {
	return records.map((r) => Object.fromEntries(columns.map((col) => [col, r[col]])));
}

export async function executeSearch(req: Request, res: Response, repos: Repositories): Promise<void> {
	try {
		const jErr = validateJSON(req.body);
		if (jErr) return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(jErr) as any;

		const kind: string = req.body.kind;
		const { mfields, sfields } = FIELD_DEFS[kind];

		const eErr = validateEBNF(req.body.query, kind, mfields, sfields);
		if (eErr) return res.status(StatusCodes.BAD_REQUEST).json(eErr) as any;

		const {
			WHERE,
			OPTIONS: { COLUMNS, ORDER },
			TRANSFORMATIONS,
		} = req.body.query;

		const allRecords = await getFlatRecords(kind, repos);
		const matched: FlatRecord[] = [];
		for (const r of allRecords) {
			if (applyFilter(r, WHERE) && matched.push(r) > MAX_RESULTS) {
				return res.status(StatusCodes.REQUEST_TOO_LONG).json({
					error: "Too many results",
					message: "Query would return more than 5000 results",
					limit: 5000,
				}) as any;
			}
		}

		let processed = matched;
		if (TRANSFORMATIONS) {
			processed = applyTransformations(matched, TRANSFORMATIONS.GROUP, TRANSFORMATIONS.APPLY);
		}

		sortResults(processed, ORDER);
		const results = projectColumns(processed, COLUMNS);
		res.status(StatusCodes.OK).json(results);
	} catch {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Unknown error during query execution" });
	}
}
