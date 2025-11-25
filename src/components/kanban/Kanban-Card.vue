<script setup lang="ts">
import { useKanbanStore, type KanbanCard, type Label } from "@/stores/kanban";
import { Calendar, CheckSquare, GripVertical, Paperclip, Tag } from "lucide-vue-next";
import { DialogRoot, DialogTrigger } from 'reka-ui';
import { computed, onMounted, ref } from "vue";
import KanbanCardModal from "./Kanban-Card-Modal.vue";

const props = defineProps<{
    kanbanCardId: string;
    projectId: string;
    isDragging?: boolean;
}>();

const kanbanStore = useKanbanStore();
const cardData = ref<KanbanCard>();
const isLoading = ref(false);
const todosCount = ref(0);
const completedTodosCount = ref(0);
const attachmentsCount = ref(0);
const labels = ref<Label[]>([]);

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

const isDueSoon = computed(() => {
    if (!cardData.value?.dueDate) return false;
    const dueDate = new Date(cardData.value.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
});

const isOverdue = computed(() => {
    if (!cardData.value?.dueDate) return false;
    const dueDate = new Date(cardData.value.dueDate);
    const today = new Date();
    return dueDate < today;
});

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
};

const formatDueDate = (date: Date): string => {
    const dueDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate.getTime() === today.getTime()) return 'Today';
    if (dueDate.getTime() === tomorrow.getTime()) return 'Tomorrow';

    const month = dueDate.toLocaleDateString('en-US', { month: 'short' });
    const day = dueDate.getDate();
    return `${month} ${day}`;
};

async function fetchCardDataLocal(cardId: string) {
    try {
        isLoading.value = true;
        const response = await kanbanStore.getCardById(cardId);
        cardData.value = response;

        const [todos, attachments, cardLabels] = await Promise.all([
            kanbanStore.fetchCardTodos(cardId),
            kanbanStore.fetchCardAttachments(cardId),
            kanbanStore.fetchCardLabels(cardId)
        ]);

        todosCount.value = todos.length;
        completedTodosCount.value = todos.filter(t => t.isCompleted).length;
        attachmentsCount.value = attachments.length;
        labels.value = cardLabels;
    } catch (error) {
        console.error('Failed to fetch cards:', error);
    } finally {
        isLoading.value = false;
    }
}

onMounted(async () => {
    if (props.kanbanCardId) {
        await fetchCardDataLocal(props.kanbanCardId);
    }
});
</script>

<template>
    <div class="flex flex-col w-full">
        <DialogRoot>
            <DialogTrigger as-child :disabled="isDragging">
                <div :class="[
                    'flex flex-col gap-2 mt-1 w-full h-fit rounded bg-white border border-gray-400/80 px-2 py-1.5 shadow hover:bg-gray-300/80 hover:cursor-pointer transition-all duration-200',
                    statusColor,
                    { 'opacity-50 cursor-not-allowed': cardData?.status === 'done' },
                    { 'shadow-xl scale-105': isDragging }
                ]" :style="{ borderLeftColor: priorityColor }" role="button" tabindex="0"
                    :aria-label="`Card: ${cardData?.title}, Status: ${cardData?.status}, Priority: ${cardData?.priorityId}`">

                    <div v-if="labels.length > 0" class="flex flex-wrap gap-1">
                        <div v-for="label in labels.slice(0, 3)" :key="label.id"
                            class="px-2 py-0.5 rounded-sm text-[10px] font-medium text-white"
                            :style="{ backgroundColor: label.color }">
                            {{ label.name }}
                        </div>
                        <div v-if="labels.length > 3"
                            class="px-2 py-0.5 rounded-sm text-[10px] font-medium bg-gray-200 text-gray-600 flex items-center gap-0.5">
                            <Tag :size="10" />
                            +{{ labels.length - 3 }}
                        </div>
                    </div>

                    <div class="flex items-start gap-2">
                        <div class="drag-handle pointer-events-auto cursor-grab pt-0.5" @click.stop>
                            <GripVertical class="w-4 h-4 text-gray-400" />
                        </div>
                        <h3 class="font-medium text-sm flex-1">{{ cardData?.title }}</h3>
                    </div>

                    <div v-show="cardData?.members?.length || todosCount > 0 || attachmentsCount > 0 || cardData?.dueDate"
                        class="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
                        <div v-show="cardData?.members?.length" class="flex items-center gap-1">
                            <div class="flex flex-row -space-x-1">
                                <div v-for="member in cardData?.members?.slice(0, 3)" :key="member.id" class="relative">
                                    <AvatarRoot
                                        class="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-gray-700 align-middle select-none ring-1 ring-white">
                                        <AvatarFallback
                                            class="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white"
                                            :delay-ms="600" :title="member.name">
                                            {{ getInitials(member.name) }}
                                        </AvatarFallback>
                                    </AvatarRoot>
                                </div>
                                <div v-if="cardData?.members && cardData.members.length > 3"
                                    class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-[10px] font-semibold text-gray-700 ring-1 ring-white">
                                    +{{ cardData.members.length - 3 }}
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 ml-auto">
                            <div v-if="todosCount > 0" class="flex items-center gap-1" :class="{
                                'text-green-600': completedTodosCount === todosCount,
                                'text-gray-500': completedTodosCount !== todosCount
                            }">
                                <CheckSquare :size="14" />
                                <span class="text-xs font-medium">{{ completedTodosCount }}/{{ todosCount }}</span>
                            </div>

                            <div v-if="attachmentsCount > 0" class="flex items-center gap-1 text-gray-500">
                                <Paperclip :size="14" />
                                <span class="text-xs font-medium">{{ attachmentsCount }}</span>
                            </div>

                            <div v-if="cardData?.dueDate" class="flex items-center gap-1 px-1.5 py-0.5 rounded" :class="{
                                'bg-red-100 text-red-700': isOverdue,
                                'bg-yellow-100 text-yellow-700': isDueSoon,
                                'text-gray-500': !isOverdue && !isDueSoon
                            }">
                                <Calendar :size="14" />
                                <span class="text-xs font-medium">{{ formatDueDate(cardData.dueDate) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogTrigger>
            <KanbanCardModal :card-data="cardData" :project-id="props.projectId"
                @update:card="fetchCardDataLocal(props.kanbanCardId)" />
        </DialogRoot>
    </div>
</template>
