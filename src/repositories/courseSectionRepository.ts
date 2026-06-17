import { Course } from "../models/course";
import { Section } from "../models/section";
import { Store } from "../storage/types";

export class CourseSectionRepository {
	private store: Store;

	constructor(store: Store) {
		this.store = store;
	}
	// note this is in memory, cannot reset between tests
	protected data: { courses: Course[] } = { courses: [] };

	// based on REST w/s example
	private async readData(): Promise<Course[]> {
		const data = await this.store.readCollection("courses");
		return data;
	}

	// based on REST w/s example
	private async writeData(courses: Course[]): Promise<void> {
		await this.store.writeCollection("courses", courses);
	}

	// Below code written by Gemini - Add a synchronization method to Model.ts
	public async persistToDisk(): Promise<void> {
		await this.writeData(this.data.courses);
	}
	// above code written by gemini

	public async setCourseDataset(id: string, title: string, dept: string, code: string): Promise<Course> {
		let course = await this.getCourseByIdAsync(id);

		if (course === undefined) {
			course = { id, title, dept, code, sections: [] };
			this.data.courses.push(course);
			this.data.courses.sort((a, b) => a.id.localeCompare(b.id)); // written using https://pythonguides.com/sort-string-arrays-in-typescript/
		} else {
			course.title = title;
			course.dept = dept;
			course.code = code;
		}
		return course;
	}

	public async setSectionDataset(
		course: Course,
		id: string,
		instructor: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number
	): Promise<Section> {
		let section = await this.getSectionByIdAsync(course, id);
		if (!section) {
			section = { id, instructor, year, avg, pass, fail, audit, courseId: course.id };
			course.sections.push(section);
			course.sections.sort((a, b) => a.id.localeCompare(b.id));
		} else {
			section.instructor = instructor;
			section.year = year;
			section.avg = avg;
			section.pass = pass;
			section.fail = fail;
			section.audit = audit;
		}
		return section;
	}

	public async getCourses(): Promise<Course[]> {
		this.data.courses = await this.readData();
		return this.data.courses;
	}
	// copilot generated (AI) below - adapted from code previously written by copilot
	public async getCourseByIdAsync(id: string): Promise<Course | undefined> {
		return this.data.courses.find((c) => c.id === id);
	}
	// copilot generated (AI) above
	public async setCourseAsync(id: string, title: string, dept: string, code: string): Promise<Course> {
		let course = await this.getCourseByIdAsync(id);

		if (course === undefined) {
			course = { id, title, dept, code, sections: [] };
			this.data.courses.push(course);
			this.data.courses.sort((a, b) => a.id.localeCompare(b.id)); // written using https://pythonguides.com/sort-string-arrays-in-typescript/
		} else {
			course.title = title;
			course.dept = dept;
			course.code = code;
		}
		await this.writeData(this.data.courses);
		return course;
	}

	public async deleteCourse(course: Course): Promise<Course> {
		const index = this.data.courses.findIndex((c) => c.id === course.id);
		const deleted = this.data.courses.splice(index, 1);
		await this.writeData(this.data.courses);
		return deleted[0];
	}

	public getSections(course: Course): Section[] {
		return course.sections;
	}

	public async getSectionByIdAsync(course: Course, id: string): Promise<Section | undefined> {
		return course.sections.find((section) => section.id === id);
	}

	public async setSectionAsync(
		course: Course,
		id: string,
		instructor: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number
	): Promise<Section> {
		let section = await this.getSectionByIdAsync(course, id);
		if (!section) {
			section = { id, instructor, year, avg, pass, fail, audit, courseId: course.id };
			course.sections.push(section);
			course.sections.sort((a, b) => a.id.localeCompare(b.id));
		} else {
			section.instructor = instructor;
			section.year = year;
			section.avg = avg;
			section.pass = pass;
			section.fail = fail;
			section.audit = audit;
		}
		await this.writeData(this.data.courses);
		return section;
	}

	// validation occured alr
	public async deleteSectionAsync(course: Course, sectionId: string): Promise<Section> {
		const index = course.sections.findIndex((section) => section.id === sectionId);
		const deleted = course.sections.splice(index, 1);
		await this.writeData(this.data.courses);
		return deleted[0];
	}

	// validation occured alr
	public deleteSection(course: Course, sectionId: string): Section {
		const index = course.sections.findIndex((section) => section.id === sectionId);
		const deleted = course.sections.splice(index, 1);
		return deleted[0];
	}
}
