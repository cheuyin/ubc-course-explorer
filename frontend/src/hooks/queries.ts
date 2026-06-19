import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import {
	searchCourseOfferings,
	fetchDepartments,
	fetchDepartmentCourses,
	searchInstructorOfferings,
	searchRooms,
	type CourseSearchFilters,
	type Order,
} from "../api/search";
import type { Building, BuildingRoom, Course, Section } from "../types";

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

export function useDepartmentCourses(dept: string | undefined) {
	return useQuery({
		queryKey: ["departmentCourses", dept],
		queryFn: () => fetchDepartmentCourses(dept!),
		enabled: !!dept,
		staleTime: 60 * 1000,
	});
}

export function useInstructorOfferings(name: string | undefined) {
	return useQuery({
		queryKey: ["instructorOfferings", name],
		queryFn: () => searchInstructorOfferings(name!),
		enabled: !!name,
		staleTime: 60 * 1000,
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

export function useBuildings() {
	return useQuery({
		queryKey: ["buildings"],
		queryFn: async (): Promise<Building[]> => {
			const res = await api.get("/v2/buildings", { params: { limit: 5000 } });
			return res.data.items as Building[];
		},
		staleTime: 5 * 60 * 1000,
	});
}

export function useBuilding(buildingId: string | undefined) {
	return useQuery({
		queryKey: ["building", buildingId],
		queryFn: async (): Promise<Building> => {
			const res = await api.get(`/v2/buildings/${buildingId}`);
			return res.data as Building;
		},
		enabled: !!buildingId,
	});
}

export function useBuildingRooms(buildingId: string | undefined) {
	return useQuery({
		queryKey: ["buildingRooms", buildingId],
		queryFn: async (): Promise<BuildingRoom[]> => {
			const res = await api.get(`/v2/buildings/${buildingId}/rooms`, { params: { limit: 5000 } });
			return res.data.items as BuildingRoom[];
		},
		enabled: !!buildingId,
	});
}

/** Every room across campus (364 in the demo set — well under the search cap). */
export function useRooms() {
	return useQuery({
		queryKey: ["rooms"],
		queryFn: () => searchRooms({}),
		staleTime: 5 * 60 * 1000,
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
