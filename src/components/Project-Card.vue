<script setup lang="ts">
import { defineProps } from "vue";

interface Project {
  id: string;
  title: string;
  description?: string;
  // Add other project properties as needed
}

const props = defineProps<{
  project: Project;
}>();
</script>

<template>
  <div
    class="flex aspect-square w-auto min-w-64 cursor-pointer flex-col rounded-lg border bg-white p-4 shadow-md transition-shadow hover:shadow-lg"
  >
    <div
      class="mb-3 flex h-4/5 w-full rounded-md bg-gradient-to-br from-blue-500 to-blue-600"
    ></div>
    <div class="flex-1">
      <h3 class="truncate font-semibold text-gray-900">{{ project.title }}</h3>
      <p class="mt-1 line-clamp-2 text-sm text-gray-600">
        {{ project.description || "No description available" }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
