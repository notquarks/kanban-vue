<script setup lang="ts">
import navbar from "./components/navbar.vue";
import { RouterView } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { onMounted } from "vue";

const authStore = useAuthStore();

onMounted(async () => {
  
  if (!authStore.isAuthenticated && authStore.token) {
    try {
      await authStore.checkAuth();
    } catch (error) {}
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="sticky top-0 z-50 w-full border-b bg-white">
      <navbar v-if="authStore.isAuthenticated" />
    </header>

    <main class="container mx-auto px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>

<style scoped></style>
