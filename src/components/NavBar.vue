<script setup lang="ts">
import {
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
} from "reka-ui";
import { ArrowLeft, Kanban } from "lucide-vue-next";
import { useRoute, RouterLink } from "vue-router";
import { computed, onMounted, watch } from "vue";
import { type Project, useProjectsStore } from "@/stores/projects";
import { useAuthStore } from "@/stores/auth";

const route = useRoute("/project/[id]");
const projectStore = useProjectsStore();
const authStore = useAuthStore();

const isProjectPage = computed(() => route.path.startsWith("/project/"));

const menuItems = [
  { name: "Dashboard", path: "/", label: "Dashboard" },
  { name: "Task", path: "/task", label: "Task" },
  { name: "Teams", path: "/teams", label: "Teams" },
];

const projectId = computed(() => route.params.id as string | undefined);

const project = computed<Project | undefined>(() => {
  if (isProjectPage.value && projectId.value) {
    return projectStore.projects.find((p) => p.id === projectId.value);
  }
  return undefined;
});

async function ensureProjectsLoaded() {
  if (!authStore.token) {
    return;
  }

  if (projectStore.projects.length === 0) {
    await projectStore.fetchProjects().catch((error) => {
      console.error("Failed to fetch projects:", error);
    });
  }
}

onMounted(async () => {
  await ensureProjectsLoaded();
});

watch(
  [() => route.path, () => projectId.value, () => authStore.token],
  async () => {
    await ensureProjectsLoaded();
  },
);
</script>

<template>
  <NavigationMenuRoot
    class="relative z-[1] flex w-full border-b border-gray-200 bg-white"
  >
    <NavigationMenuList
      v-if="!isProjectPage"
      class="flex list-none items-center space-x-1 p-4"
    >
      <NavigationMenuItem>
        <NavigationMenuLink as-child>
          <RouterLink
            to="/"
            class="group kanban-nav-link flex items-center space-x-2 rounded-md p-2 transition-colors hover:bg-gray-100"
          >
            <Kanban class="h-6 w-6" />
            <span class="font-semibold">Kanban</span>
          </RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem v-for="item in menuItems" :key="item.name">
        <NavigationMenuLink as-child>
          <RouterLink
            :to="item.path"
            :class="[
              'group kanban-nav-link inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50',
              route.name === item.name
                ? 'bg-gray-100 text-gray-900'
                : 'bg-transparent text-gray-700 hover:bg-gray-50',
            ]"
          >
            <span>{{ item.label }}</span>
          </RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
    <NavigationMenuList
      v-else
      class="flex list-none items-center space-x-1 p-4"
    >
      <NavigationMenuItem class="flex flex-row items-center">
        <NavigationMenuLink as-child class="flex flex-row">
          <RouterLink
            to="/"
            class="group kanban-nav-link flex items-center space-x-2 rounded-md p-2 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft />
          </RouterLink>
          <span class="ml-4 text-lg font-semibold text-gray-900">{{
            project?.name || "Project"
          }}</span>
          <span class="text-lg font-semibold text-gray-900">&nbsp;Board</span>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenuRoot>
</template>

<style scoped>
/* Component-specific styles */
</style>
