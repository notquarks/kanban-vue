<script setup lang="ts">
import {
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
} from "radix-vue";
import { Kanban } from "lucide-vue-next";
import { useRoute, RouterLink } from "vue-router";

const route = useRoute();
const menuItems = [
  { name: "Dashboard", path: "/", label: "Dashboard" },
  { name: "Task", path: "/task", label: "Task" },
  { name: "Teams", path: "/teams", label: "Teams" },
];
</script>

<template>
  <NavigationMenuRoot class="bg-background relative z-[1] flex w-full">
    <NavigationMenuList class="flex list-none items-center space-x-1 p-4">
      <NavigationMenuItem>
        <NavigationMenuLink as-child>
          <RouterLink
            to="/"
            class="group hover:bg-accent kanban-nav-link flex items-center space-x-2 rounded-md p-2 transition-colors"
          >
            <Kanban class="h-6 w-6" />
            <span class="font-semibold">Kanban</span>
          </RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem v-for="item in menuItems" :key="item.name">
        <NavigationMenuLink as-child>
          <RouterLink
            :to="item.path"
            :class="[
              'group kanban-nav-link inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50',
              route.name === item.name
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground hover:bg-accent/50 bg-transparent',
            ]"
          >
            <span>{{ item.label }}</span>
          </RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenuRoot>
</template>

<style scoped>
/* Component-specific styles */
</style>
