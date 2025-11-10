<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <div class="py-16 text-center">
    <h1 class="text-6xl font-bold text-gray-800">404</h1>
    <h2 class="mt-4 text-2xl font-semibold">Page Not Found</h2>
    <p class="mt-2 text-gray-600">
      Sorry, the page you are looking for does not exist.
    </p>
    <div class="mt-8">
      <RouterLink to="/" class="rounded-md bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700">
        Go back to Dashboard
      </RouterLink>
    </div>
  </div>
</template>
