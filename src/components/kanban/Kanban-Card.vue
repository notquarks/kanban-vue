<script setup lang="ts">
import { useKanbanStore, type KanbanCard } from "@/stores/kanban";
import { AlertCircle, Calendar, GripVertical, User } from "lucide-vue-next";
import {
    DialogRoot,
    DialogTrigger
} from 'reka-ui';
import { computed, onMounted, ref } from "vue";
import KanbanCardModal from "./Kanban-Card-Modal.vue";

const props = defineProps<{
    kanbanCardId: string;
    isDragging?: boolean;
}>();

const kanbanStore = useKanbanStore();
const cardData = ref<KanbanCard>();
const isLoading = ref(false);

const priorityColor = computed(() => {
    if (!cardData.value) return '';
    const priority = kanbanStore.getPriorityById(cardData.value.priorityId);
    return priority?.color || '#gray';
});


const statusColor = computed(() => {
    if (!cardData.value) return '';
    const statusColors = {
        'todo': 'border-l-gray-400',
        'in_progress': 'border-l-blue-400',
        'review': 'border-l-yellow-400',
        'done': 'border-l-green-400'
    };
    return statusColors[cardData.value.status] || 'border-l-gray-400';
});

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
    <DialogRoot class="flex flex-col w-full">
        <DialogTrigger class="flex flex-col w-full" :disabled="isDragging">
            <div :class="[
                'flex flex-col gap-2 mt-1 w-full h-fit rounded bg-white border border-gray-400/80 px-2 py-1.5 shadow hover:bg-gray-300/80 hover:cursor-pointer transition-all duration-200',
                statusColor,
                { 'opacity-50 cursor-not-allowed': cardData?.status === 'done' },
                { 'shadow-xl scale-105': isDragging }
            ]" :style="{ borderLeftColor: priorityColor }" role="button" tabindex="0"
                :aria-label="`Card: ${cardData?.title}, Status: ${cardData?.status}, Priority: ${cardData?.priorityId}`">
                <div class="flex flex-row space-x-2">
                    <div class="drag-handle flex items-center justify-between mb-1">
                        <GripVertical class="w-4 h-4 text-gray-400 cursor-grab" />
                        <div class="flex items-center gap-1">
                            <AlertCircle v-if="cardData?.priorityId! > 2" class="w-4 h-4 text-red-500" />
                            <Calendar v-if="cardData?.dueDate" class="w-4 h-4 text-blue-500" />
                        </div>
                    </div>
                    <h3 class="font-medium text-sm mb-1">{{ cardData?.title }}</h3>
                </div>
                <div v-show="cardData?.assigneeId" class="flex items-center justify-between text-xs text-gray-500">
                    <div class="flex items-center gap-1">
                        <User class="w-3 h-3" />
                        <span v-if="cardData?.assigneeId">Assigned</span>
                        <span v-else>Unassigned</span>
                    </div>
                    <div v-if="cardData?.dueDate" class="text-xs">
                        {{ new Date(cardData.dueDate).toLocaleDateString() }}
                    </div>
                </div>
            </div>
        </DialogTrigger>
        <KanbanCardModal :card-data="cardData" />
    </DialogRoot>
</template>
