<script setup lang="ts">
import type { Project } from "@/stores/projects";
import { computed, defineEmits, defineProps, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  isEditing: boolean;
  initialData?: Partial<Pick<Project, "name" | "description">> | null;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "submit", data: { name: string; description: string }): void;
}>();

const name = ref("");
const description = ref("");

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      name.value = props.initialData?.name || "";
      description.value = props.initialData?.description || "";
    } else {
      document.body.style.overflow = "";
    }
  },
);

const modalTitle = computed(() =>
  props.isEditing ? "Edit Project" : "Create New Project",
);

const submitButtonText = computed(() => {
  if (props.isLoading) {
    return props.isEditing ? "Saving..." : "Creating...";
  }
  return props.isEditing ? "Save Changes" : "Create";
});

function handleSubmit() {
  if (name.value.trim()) {
    emit("submit", {
      name: name.value,
      description: description.value,
    });
  }
}

function handleClose() {
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-800/90 py-14 text-white transition-opacity"
      @click.self="handleClose"
    >
      <div
        class="w-full max-w-md rounded-lg bg-white p-6 text-gray-900 shadow-lg"
      >
        <div class="flex-1">
          <h3 class="mb-3 text-lg font-semibold">{{ modalTitle }}</h3>

          <div class="space-y-3">
            <div>
              <Label
                for="project-name"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Project Name
              </Label>
              <input
                id="project-name"
                v-model="name"
                type="text"
                class="w-full rounded-xs border border-gray-300 px-3 py-2 focus:border-b-2 focus:border-b-gray-900 focus:outline-none"
                placeholder="Enter project name"
                @keyup.enter="handleSubmit"
              />
            </div>

            <div>
              <Label
                for="project-description"
                class="mb-1 block text-sm font-medium text-gray-700"
              >
                Description
              </Label>
              <textarea
                id="project-description"
                v-model="description"
                rows="3"
                class="w-full resize-none rounded-xs border border-gray-300 px-3 py-2 focus:border-b-2 focus:border-b-gray-900 focus:outline-none"
                placeholder="Enter project description"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          <button
            @click="handleSubmit"
            :disabled="isLoading || !name.trim()"
            class="focus:ring-offset-0.5 flex-1 rounded-xs bg-black px-3 py-2 text-white transition-colors hover:cursor-pointer hover:bg-gray-700 focus:ring-2 focus:ring-gray-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ submitButtonText }}
          </button>
          <button
            @click="handleClose"
            class="rounded-xs border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:cursor-pointer hover:bg-red-800 hover:text-white focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
