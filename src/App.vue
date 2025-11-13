<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import { RouterView } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { onMounted } from "vue";

const authStore = useAuthStore();

onMounted(async () => {

  if (!authStore.isAuthenticated && authStore.token) {
    try {
      await authStore.checkAuth();
    } catch (error) { }
  }
});
</script>

<template>
  <div class="max-w-dvw h-full flex flex-col w-full bg-gray-50">
    <header class="sticky top-0 z-50 w-full border-b bg-white">
      <NavBar v-if="authStore.isAuthenticated" />
    </header>
    <main class="flex w-full h-full flex-grow">
      <RouterView />
    </main>
  </div>
</template>

<style scoped></style>
