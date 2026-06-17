import { Request, Response } from "express";
import { CourseSectionRepository } from "../../repositories/courseSectionRepository";
import { StatusCodes } from "http-status-codes";

const MFIELDS = ["avg", "pass", "fail", "audit", "year"];
const SFIELDS = ["dept", "instructor", "title", "code"];

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
		| "WHERE must be an object with at most one FILTER"
		| "OPTIONS must be an object with COLUMNS and optional ORDER"
		| "AND must be a non-empty array of FILTER objects"
		| "OR must be a non-empty array of FILTER objects"
		| "NOT must be a FILTER object"
		| "LT must be an object with one mfield of type number"
		| "GT must be an object with one mfield of type number"
		| "EQ must be an object with one mfield of type number"
		| "IS must be an object with one sfield of type string"
		| "IS asterisks can only be first or last character";
};

// below written with Gemini

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
	} else if (body.kind !== "course_offerings") {
		errors.fields.kind = "expected to be course_offerings";
	}

	if (!("query" in body)) {
		errors.fields.query = "required but missing";
	} else if (typeof body.query !== "object" || body.query === null) {
		errors.fields.query = "expected an object";
	}

	return Object.keys(errors.fields).length > 0 ? errors : null;
}

// ===== 2. EBNF Logic Validation =====

function validateEBNF(query: any): InvalidQueryError | null {
	if (!("WHERE" in query)) return createError("Missing WHERE");
	if (!("OPTIONS" in query)) return createError("Missing OPTIONS");

	// Validate OPTIONS
	const optionsError = validateOptions(query.OPTIONS);
	if (optionsError) return createError(optionsError);

	// Validate WHERE
	const whereError = validateFilter(query.WHERE);
	if (whereError) return createError(whereError);

	return null;
}

function createError(message: InvalidQueryError["message"]): InvalidQueryError {
	return { error: "Invalid query", message };
}

function validateOptions(options: any): InvalidQueryError["message"] | null {
	if (!options || typeof options !== "object" || Array.isArray(options)) {
		return "OPTIONS must be an object with COLUMNS and optional ORDER";
	}

	if (!("COLUMNS" in options)) return "Missing COLUMNS";

	const cols = options.COLUMNS;
	if (!Array.isArray(cols) || cols.length === 0) {
		return "OPTIONS must be an object with COLUMNS and optional ORDER";
	}

	for (const col of cols) {
		if (typeof col !== "string" || (!MFIELDS.includes(col) && !SFIELDS.includes(col))) {
			return "Unknown key in COLUMNS";
		}
	}

	if ("ORDER" in options) {
		const order = options.ORDER;
		if (typeof order !== "string" || !cols.includes(order)) {
			return "ORDER must be a key in COLUMNS";
		}
	}

	return null;
}

function validateFilter(f: any): InvalidQueryError["message"] | null {
	if (!f || typeof f !== "object" || Array.isArray(f)) return "WHERE must be an object with at most one FILTER";
	const keys = Object.keys(f);
	if (keys.length === 0) return null;
	if (keys.length > 1) return "WHERE must be an object with at most one FILTER";
	const [op, v] = [keys[0], f[keys[0]]];

	if (op === "AND" || op === "OR") {
		if (!Array.isArray(v) || v.length === 0) return `${op} must be a non-empty array of FILTER objects` as any;
		return v.map(validateFilter).find((err) => err) || null;
	}
	if (op === "NOT") {
		if (!v || typeof v !== "object" || Array.isArray(v)) return "NOT must be a FILTER object";
		return validateFilter(v);
	}
	if (["LT", "GT", "EQ"].includes(op)) {
		if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== 1)
			return `${op} must be an object with one mfield of type number` as any;
		const mKey = Object.keys(v)[0];
		return MFIELDS.includes(mKey) && typeof v[mKey] === "number"
			? null
			: (`${op} must be an object with one mfield of type number` as any);
	}
	if (op === "IS") {
		if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== 1)
			return "IS must be an object with one sfield of type string";
		const sKey = Object.keys(v)[0];
		if (!SFIELDS.includes(sKey) || typeof v[sKey] !== "string")
			return "IS must be an object with one sfield of type string";
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

export async function executeSearch(req: Request, res: Response, repo: CourseSectionRepository): Promise<void> {
	try {
		const jErr = validateJSON(req.body);
		if (jErr) return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(jErr) as any;
		const eErr = validateEBNF(req.body.query);
		if (eErr) return res.status(StatusCodes.BAD_REQUEST).json(eErr) as any;

		const {
			WHERE,
			OPTIONS: { COLUMNS, ORDER },
		} = req.body.query;
		const matched: any[] = [];
		for (const c of await repo.getCourses()) {
			for (const s of c.sections) {
				const r = { dept: c.dept, title: c.title, code: c.code, ...s };
				if (applyFilter(r, WHERE) && matched.push(r) > MAX_RESULTS) {
					return res
						.status(StatusCodes.REQUEST_TOO_LONG)
						.json({ error: "Too many results", message: "Query would return more than 5000 results" }) as any;
				}
			}
		}

		if (ORDER) matched.sort((a, b) => (a[ORDER] < b[ORDER] ? -1 : a[ORDER] > b[ORDER] ? 1 : 0));
		const results = matched.map((r) => Object.fromEntries(COLUMNS.map((col: string) => [col, r[col]])));
		res.status(StatusCodes.OK).json(results);
	} catch {
		res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Unknown error during query execution" });
	}
}

// above written with Gemini
