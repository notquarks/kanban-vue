<script setup lang="ts">
import navbar from "./components/navbar.vue";
import { RouterView } from "vue-router";
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="sticky top-0 z-50 w-full border-b bg-white">
      <navbar />
    </header>

    <main class="container mx-auto px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Component-specific styles */
</style>
