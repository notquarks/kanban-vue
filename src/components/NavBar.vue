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

const route = useRoute('/project/[id]');
const projectStore = useProjectsStore();

const isProjectPage = computed(() => route.path.startsWith('/project/'));

const menuItems = [
  { name: "Dashboard", path: "/", label: "Dashboard" },
  { name: "Task", path: "/task", label: "Task" },
  { name: "Teams", path: "/teams", label: "Teams" },
];

const projectId = computed(() => route.params.id as string | undefined);

const project = computed<Project | undefined>(() => {
  if (isProjectPage.value && projectId.value) {
    const selectedProject = projectStore.getProjectById(projectId.value as string);
    return selectedProject;
  }
  return undefined;
});

async function ensureProjectsLoaded() {
  if (projectStore.projects.length === 0) {
    await projectStore.fetchProjects().catch(error => {
      console.error("Failed to fetch projects:", error);
    });
  }
}

onMounted(async () => {
  await ensureProjectsLoaded();
});

watch([() => route.path, () => projectId.value], async () => {
  await ensureProjectsLoaded();
}, { immediate: true });
</script>

<template>
  <NavigationMenuRoot class="bg-background relative z-[1] flex w-full">
    <NavigationMenuList v-if="!isProjectPage" class="flex list-none items-center space-x-1 p-4">
      <NavigationMenuItem>
        <NavigationMenuLink as-child>
          <RouterLink to="/"
            class="group hover:bg-accent kanban-nav-link flex items-center space-x-2 rounded-md p-2 transition-colors">
            <Kanban class="h-6 w-6" />
            <span class="font-semibold">Kanban</span>
          </RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem v-for="item in menuItems" :key="item.name">
        <NavigationMenuLink as-child>
          <RouterLink :to="item.path" :class="[
            'group kanban-nav-link inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50',
            route.name === item.name
              ? 'bg-accent text-accent-foreground'
              : 'text-foreground hover:bg-accent/50 bg-transparent',
          ]">
            <span>{{ item.label }}</span>
          </RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
    <NavigationMenuList v-else class="flex list-none items-center space-x-1 p-4">
      <NavigationMenuItem class="flex flex-row items-center">
        <NavigationMenuLink as-child class="flex flex-row">
          <RouterLink to="/"
            class="group hover:bg-accent kanban-nav-link flex items-center space-x-2 rounded-md p-2 transition-colors">
            <ArrowLeft />
          </RouterLink>
          <span class="font-semibold text-lg ml-4">{{ project?.name || 'Project' }}</span>
          <span class="font-semibold text-lg"> &nbsp;Board</span>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenuRoot>
</template>

<style scoped>
/* Component-specific styles */
</style>