<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useProjectsStore } from "@/stores/projects";
import { PlusIcon } from "lucide-vue-next";
import { ref } from "vue";
import ModalNewProject from "./Modal-Project.vue";

const projectStore = useProjectsStore();
const authStore = useAuthStore();

const isModalOpen = ref(false);
const isLoading = ref(false);

async function handleCreateProject(data: {
  name: string;
  description: string;
}) {
  if (!data.name.trim() || !authStore.user) {
    console.error("User not authenticated or name is empty");
    return;
  }

  isLoading.value = true;

  try {
    await projectStore.createProject({
      name: data.name,
      description: data.description,
      ownerId: authStore.user.id,
    });
    isModalOpen.value = false; // Close modal on success
  } catch (error) {
    console.error("Failed to create project:", error);
    // You could add an error message to the modal here
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <button
    @click="isModalOpen = true"
    class="flex flex-row items-center justify-center gap-0.5 rounded-sm border-gray-500 px-2 py-1 transition-all duration-100 ease-in hover:cursor-pointer hover:border hover:bg-black hover:text-white"
  >
    <PlusIcon class="h-4 w-4" />
    <p class="text-sm font-medium">New Project</p>
  </button>

  <ModalNewProject
    :open="isModalOpen"
    :is-editing="false"
    :is-loading="isLoading"
    @close="isModalOpen = false"
    @submit="handleCreateProject"
  />
</template>
