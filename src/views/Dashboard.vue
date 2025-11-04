<script setup lang="ts">
import ProjectCard from "../components/Project-Card.vue";

// All your component logic goes here
</script>

<template>
  <div class="container">
    <h1 class="text-4xl font-bold">Dashboard</h1>
    <p class="mt-4 text-lg text-gray-600">Welcome to your Kanban dashboard.</p>
    <div
      class="mt-8 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-x-1.5 gap-y-2"
    >
      <ProjectCard />
    </div>
  </div>
</template>
