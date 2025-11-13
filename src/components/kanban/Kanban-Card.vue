<script setup lang="ts">
import { useKanbanStore, type KanbanCard } from "@/stores/kanban";
import { onMounted, ref } from "vue";

const props = defineProps<{
    kanbanCardId: string;
}>();

const kanbanStore = useKanbanStore();
const cardData = ref<KanbanCard>();
const isLoading = ref(false);

async function fetchCardDataLocal(cardId: string) {
    try {
        isLoading.value = true;
        const response = await kanbanStore.getCardById(props.kanbanCardId);
        cardData.value = response
    } catch (error) {
        console.error('Failed to fetch cards:', error);
    } finally {
        isLoading.value = false;
    }
}


onMounted(async () => {
    console.log(props.kanbanCardId)
    if (props.kanbanCardId != "") {
        await fetchCardDataLocal(props.kanbanCardId);
    }
})

</script>

<template>
    <div
        class="flex flex-col gap-2 mt-1 w-full h-fit rounded bg-white border border-gray-400/80 px-2 py-1.5 shadow hover:bg-gray-300/80 hover:cursor-pointer">
        <h1>{{ cardData?.title }}</h1>
    </div>
</template>
