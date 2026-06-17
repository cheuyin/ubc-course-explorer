import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import {
	searchCourseOfferings,
	fetchDepartments,
	type CourseSearchFilters,
	type Order,
} from "../api/search";
import type { Course, Section } from "../types";

/** One-time database seed. Gates the app until data is available. */
export function useSeed() {
	return useQuery({
		queryKey: ["seed"],
		queryFn: async () => {
			await api.get("/v2/seed");
			return true;
		},
		staleTime: Infinity,
		retry: 1,
	});
}

export function useDepartments() {
	return useQuery({
		queryKey: ["departments"],
		queryFn: () => fetchDepartments(),
		staleTime: 5 * 60 * 1000,
	});
}

export function useCourseSearch(filters: CourseSearchFilters, order: Order = "dept", enabled = true) {
	return useQuery({
		queryKey: ["courseSearch", filters, order],
		queryFn: () => searchCourseOfferings(filters, order),
		enabled,
		staleTime: 60 * 1000,
	});
}

export function useCourse(courseId: string | undefined) {
	return useQuery({
		queryKey: ["course", courseId],
		queryFn: async (): Promise<Course> => {
			const res = await api.get(`/v1/courses/${courseId}`);
			return res.data;
		},
		enabled: !!courseId,
	});
}

export function useSections(courseId: string | undefined) {
	return useQuery({
		queryKey: ["sections", courseId],
		queryFn: async (): Promise<Section[]> => {
			const res = await api.get(`/v1/courses/${courseId}/sections`, { params: { limit: 5000 } });
			return res.data.items as Section[];
		},
		enabled: !!courseId,
	});
}
