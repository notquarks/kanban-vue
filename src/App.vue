<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import { useAuthStore } from "@/stores/auth";
import { computed, onMounted } from "vue";
import { RouterView, useRoute } from "vue-router";

const authStore = useAuthStore();
const route = useRoute();

const isFixedLayout = computed(() => {
    return route.path.startsWith('/project/');
});

onMounted(async () => {
    if (!authStore.isAuthenticated && authStore.token) {
        try {
            await authStore.checkAuth();
        } catch (error) { }
    }
});
</script>

<template>
    <div class="max-w-dvw flex flex-col w-full bg-gray-50"
        :class="isFixedLayout ? 'h-dvh overflow-hidden' : 'min-h-dvh'">
        <header class="sticky top-0 z-50 w-full border-b bg-white flex-shrink-0">
            <NavBar v-if="authStore.isAuthenticated" />
        </header>
        <main class="flex w-full flex-grow" :class="isFixedLayout ? 'overflow-hidden min-h-0' : ''">
            <RouterView />
        </main>
    </div>
</template>

<style scoped></style>
