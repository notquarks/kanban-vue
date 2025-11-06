<script setup lang="ts">
import { ref } from "vue";

const isOpen = ref(false);
const projectTitle = ref("");
const projectDescription = ref("");
const isLoading = ref(false);

const emit = defineEmits<{
  projectCreated: [project: { title: string; description: string }];
}>();

async function createProject() {
  if (!projectTitle.value.trim()) return;

  isLoading.value = true;

  try {
    emit("projectCreated", {
      title: projectTitle.value,
      description: projectDescription.value,
    });

    projectTitle.value = "";
    projectDescription.value = "";
    isOpen.value = false;
  } catch (error) {
    console.error("Failed to create project:", error);
  } finally {
    isLoading.value = false;
  }
}

function cancelCreate() {
  projectTitle.value = "";
  projectDescription.value = "";
  isOpen.value = false;
}
</script>

<template>
  <div
    v-if="!isOpen"
    class="flex aspect-square w-auto min-w-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 shadow-sm transition-colors hover:border-gray-400 hover:bg-gray-50"
  >
    <div class="text-center">
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
          d="M12 4v16m8-8H4"
        ></path>
      </svg>
      <p class="mt-2 text-sm font-medium text-gray-600">New Project</p>
    </div>
    <button
      @click="isOpen = true"
      class="absolute inset-0 h-full w-full"
    ></button>
  </div>

  <div
    v-else
    class="flex aspect-square w-auto min-w-64 flex-col rounded-lg border bg-white p-4 shadow-lg"
  >
    <div class="flex-1">
      <h3 class="mb-3 text-lg font-semibold">Create New Project</h3>

      <div class="space-y-3">
        <div>
          <label
            for="project-title"
            class="mb-1 block text-sm font-medium text-gray-700"
          >
            Project Title
          </label>
          <input
            id="project-title"
            v-model="projectTitle"
            type="text"
            class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter project title"
            @keyup.enter="createProject"
          />
        </div>

        <div>
          <label
            for="project-description"
            class="mb-1 block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="project-description"
            v-model="projectDescription"
            rows="3"
            class="w-full resize-none rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter project description (optional)"
          ></textarea>
        </div>
      </div>
    </div>

    <div class="mt-4 flex gap-2">
      <button
        @click="createProject"
        :disabled="isLoading || !projectTitle.trim()"
        class="flex-1 rounded-md bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ isLoading ? "Creating..." : "Create" }}
      </button>
      <button
        @click="cancelCreate"
        class="rounded-md border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
      >
        Cancel
      </button>
    </div>
  </div>
</template>
