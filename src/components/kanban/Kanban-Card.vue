<script setup lang="ts">
import type { KanbanCard } from "@/stores/kanban";

const props = defineProps<{
    kanbanCard: KanbanCard;
}>();
</script>

<template>
    <div class="flex flex-col gap-2 rounded bg-white p-4 shadow">
        <h1>{{ kanbanCard.title }}</h1>
        <p>{{ kanbanCard.description }}</p>
    </div>
</template>
