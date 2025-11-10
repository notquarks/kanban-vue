<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();

definePage({
  meta: {
    requiresAuth: true,
    title: 'Project'
  }
})

const projectId = route.query.id as string;
</script>

<template>
  <div>
    <h1>This is kanban board</h1>
    <h1>Kanban Board {{ projectId }}</h1>
    <div></div>
  </div>
</template>
