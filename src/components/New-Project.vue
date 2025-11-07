<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";
import { watch } from "vue";
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
watch(isOpen, (value) => {
  if (value) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
});
</script>

<template>
  <button
    @click="isOpen = true"
    class="flex flex-row items-center justify-center gap-0.5 rounded-sm border-gray-500 px-2 py-1 transition-all duration-100 ease-in hover:cursor-pointer hover:border hover:bg-black hover:text-white"
  >
    <PlusIcon class="h-4 w-4" />
    <p class="text-sm font-medium">New Project</p>
  </button>

  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-800/90 py-14 text-white transition-opacity"
    >
      <div
        class="w-full max-w-md rounded-lg bg-white p-6 text-gray-900 shadow-lg"
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
            class="flex-1 rounded-md bg-black px-3 py-2 text-white transition-colors hover:cursor-pointer hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isLoading ? "Creating..." : "Create" }}
          </button>
          <button
            @click="cancelCreate"
            class="rounded-md border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:cursor-pointer hover:bg-red-800 hover:text-white focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
