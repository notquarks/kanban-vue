import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../utils/api";

// Define types matching the database schema exactly
export interface Project {
	id: string;
	name: string;
	description: string;
	ownerId: string;
	teamId?: string | null;
	status: "planning" | "in_progress" | "completed" | "on_hold" | "cancelled";
	startDate?: Date | null;
	endDate?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateProjectData {
	name: string;
	description?: string;
	ownerId: string;
	teamId?: string;
	status?: Project["status"];
	startDate?: Date;
	endDate?: Date;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
	id?: string;
}

export const useProjectsStore = defineStore("projects", () => {
	const projects = ref<Project[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const fetchProjects = async (): Promise<Project[]> => {
		loading.value = true;
		error.value = null;

		try {
			const response = await api.get("/projects");
			const data = response.projects || response;
			projects.value = data;
			return data;
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Unable to fetch projects";
			throw err;
		} finally {
			loading.value = false;
		}
	};

	const createProject = async (
		projectData: CreateProjectData,
	): Promise<Project> => {
		loading.value = true;
		error.value = null;

		try {
			const response = await api.post("/projects", projectData);
			const data = response.project || response;
			projects.value.push(data);
			return data;
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Unable to create project";
			throw err;
		} finally {
			loading.value = false;
		}
	};

	const updateProject = async (
		id: string,
		projectData: UpdateProjectData,
	): Promise<Project> => {
		loading.value = true;
		error.value = null;

		try {
			const response = await api.put(`/projects/${id}`, projectData);
			const data = response.project || response;
			const index = projects.value.findIndex((p: Project) => p.id === id);
			if (index !== -1) {
				projects.value[index] = data;
			}
			return data;
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Unable to update project";
			throw err;
		} finally {
			loading.value = false;
		}
	};

	const deleteProject = async (id: string): Promise<void> => {
		loading.value = true;
		error.value = null;

		try {
			await api.delete(`/projects/${id}`);
			projects.value = projects.value.filter((p: Project) => p.id !== id);
		} catch (err) {
			error.value =
				err instanceof Error ? err.message : "Unable to delete project";
			throw err;
		} finally {
			loading.value = false;
		}
	};

	// Helper functions
    const getProjectById = (id: string): Project | undefined => {
        const found = projects.value.find((p: Project) => p.id === id);
        return found;
    };

	const getProjectsByOwner = (ownerId: string): Project[] => {
		return projects.value.filter((p: Project) => p.ownerId === ownerId);
	};

	const getProjectsByTeam = (teamId: string): Project[] => {
		return projects.value.filter((p: Project) => p.teamId === teamId);
	};

	const getProjectsByStatus = (status: Project["status"]): Project[] => {
		return projects.value.filter((p: Project) => p.status === status);
	};

	const clearProjects = (): void => {
		projects.value = [];
	};

	return {
		projects,
		loading,
		error,
		fetchProjects,
		createProject,
		updateProject,
		deleteProject,
		getProjectById,
		getProjectsByOwner,
		getProjectsByTeam,
		getProjectsByStatus,
		clearProjects,
	};
});
