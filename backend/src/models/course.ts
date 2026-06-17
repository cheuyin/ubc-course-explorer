import { Section } from "./section";

export interface Course {
	id: string;
	title: string;
	dept: string;
	code: string;
	sections: Section[];
}
