import { defineStore } from "pinia";
import { api } from "../utils/api";
import { ref } from "vue";

// Define types matching the database schema exactly
export interface Team {
  id: string;
  name: string;
  description?: string | null;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  avatar?: string;
}

export interface UpdateTeamData extends Partial<CreateTeamData> {
  id?: string;
}

export const useTeamsStore = defineStore("teams", () => {
  const teams = ref<Team[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchTeams = async (): Promise<Team[]> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.get("/teams");
      teams.value = data;
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch teams";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createTeam = async (teamData: CreateTeamData): Promise<Team> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.post("/teams", teamData);
      teams.value.push(data);
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to create team";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateTeam = async (
    id: string,
    teamData: UpdateTeamData,
  ): Promise<Team> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.put(`/teams/${id}`, teamData);
      const index = teams.value.findIndex((t: Team) => t.id === id);
      if (index !== -1) {
        teams.value[index] = data;
      }
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to update team";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteTeam = async (id: string): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/teams/${id}`);
      teams.value = teams.value.filter((t: Team) => t.id !== id);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to delete team";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Helper functions
  const getTeamById = (id: string): Team | undefined => {
    return teams.value.find((t: Team) => t.id === id);
  };

  const searchTeams = (query: string): Team[] => {
    const lowerQuery = query.toLowerCase();
    return teams.value.filter(
      (t: Team) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        (t.description?.toLowerCase().includes(lowerQuery) ?? false),
    );
  };

  // Utility function to clear the teams array
  const clearTeams = (): void => {
    teams.value = [];
  };

  const fetchAllUsers = async (): Promise<any[]> => {
    try {
      const response = await api.get("/users");
      return response.users || [];
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to fetch users";
      return [];
    }
  };

  const addUserToTeam = async (
    teamId: string,
    userId: string,
  ): Promise<any> => {
    loading.value = true;
    error.value = null;

    try {
      const data = await api.post(`/teams/${teamId}/users/${userId}`, {});
      return data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to add user to team";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removeUserFromTeam = async (
    teamId: string,
    userId: string,
  ): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/teams/${teamId}/users/${userId}`);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Unable to remove user from team";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    teams,
    loading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    getTeamById,
    searchTeams,
    clearTeams,
    fetchAllUsers,
    addUserToTeam,
    removeUserFromTeam,
  };
});
