<script setup lang="ts">
import { onMounted } from "vue";
import { useProjectsStore } from "../stores/projects";
import { useAuthStore } from "../stores/auth";
import ProjectCard from "../components/Project-Card.vue";
import NewProject from "../components/New-Project.vue";

const projectStore = useProjectsStore();
const authStore = useAuthStore();

onMounted(async () => {
  if (authStore.isAuthenticated) {
    projectStore.fetchProjects().catch((_error) => {});
  }
});

async function handleProjectCreated(projectData: {
  title: string;
  description: string;
}) {
  try {
    await projectStore.createProject({
      name: projectData.title,
      description: projectData.description,
      ownerId: authStore.user?.id || "",
      status: "planning",
    });
  } catch (error) {
    console.error("Failed to create project:", error);
  }
}
</script>

<template>
  <div class="container">
    <h1 class="text-4xl font-bold">Dashboard</h1>
    <p class="my-4 mt-2 text-lg text-gray-600">
      Welcome to your Kanban dashboard.
    </p>

    <div
      v-if="projectStore.loading"
      class="flex items-center justify-center py-12"
    >
      <div
        class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"
      ></div>
    </div>

    <div
      v-else-if="projectStore.error"
      class="mb-6 rounded-md border border-red-200 bg-red-50 p-4"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg
            class="h-5 w-5 text-red-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            Error loading projects
          </h3>
          <p class="mt-1 text-sm text-red-700">{{ projectStore.error }}</p>
        </div>
      </div>
    </div>

    <div v-else>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-2xl font-semibold text-gray-900">
          Your Projects ({{ projectStore.projects.length }})
        </h2>
      </div>

      <div v-if="projectStore.projects.length === 0" class="py-12 text-center">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No projects yet</h3>
        <p class="mt-1 text-sm text-gray-500">
          Get started by creating your first project.
        </p>
      </div>

      <div
        v-else
        class="mt-8 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2"
      >
        <ProjectCard
          v-for="project in projectStore.projects"
          :key="project.id"
          :project="project"
        />
        <NewProject @project-created="handleProjectCreated" />
      </div>
    </div>
  </div>
</template>
