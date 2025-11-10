<script setup lang="ts">
import { CircleX, SquareDashedKanban } from "lucide-vue-next";
import { onMounted } from "vue";
import NewProject from "@/components/project/New-Project.vue";
import ProjectCard from "@/components/project/Project-Card.vue";
import { useAuthStore } from "@/stores/auth";
import { useProjectsStore } from "@/stores/projects";

const projectStore = useProjectsStore();
const authStore = useAuthStore();

onMounted(async () => {
  if (authStore.isAuthenticated) {
    projectStore
      .fetchProjects()
      .catch((_error) => {})
      .finally(() => {
        console.log(projectStore.projects);
      });
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
      class="flex min-h-[50vh] items-center justify-center text-center"
    >
      <div class="h-12 w-12 animate-spin border-4 border-gray-800" />
    </div>

    <div
      v-else-if="projectStore.error"
      class="mb-6 rounded-md border border-red-200 bg-red-50 p-4"
    >
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <CircleX class="h-5 w-5 text-red-700" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            Error loading projects
          </h3>
          <p class="mt-1 text-sm text-red-700">{{ projectStore.error }}</p>
        </div>
      </div>
    </div>

    <div v-else class="flex h-full w-full flex-col">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold text-gray-900">
          Your Projects ({{ projectStore.projects.length }})
        </h2>
        <NewProject @project-created="handleProjectCreated" />
      </div>

      <div
        v-if="projectStore.projects.length === 0"
        class="flex min-h-[50vh] items-center justify-center text-center"
      >
        <div class="flex flex-col">
          <SquareDashedKanban class="mx-auto h-14 w-14" />
          <h3 class="mt-2 text-sm font-medium text-gray-900">
            No projects yet
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            Get started by creating your first project.
          </p>
        </div>
      </div>

      <div
        v-else
        class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2"
      >
        <ProjectCard
          v-for="project in projectStore.projects"
          :key="project.id"
          :project="project"
        />
      </div>
    </div>
  </div>
</template>
