<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useKanbanStore, type KanbanCard, type KanbanColumn } from '@/stores/kanban';
import { GripVertical, Pencil } from 'lucide-vue-next';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger, Label } from 'reka-ui';
import { computed, onMounted, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import KanbanCardComp from './Kanban-Card.vue';


const props = defineProps<{
    projectId: string;
    listId: string;
    isLoading: boolean;
}>();

const emit = defineEmits<{
    'card-moved': [event: {
        cardId: string;
        fromColumnId: string;
        toColumnId: string;
        newIndex: number;
        oldIndex: number;
    }];
}>();

const kanbanStore = useKanbanStore();
const authStore = useAuthStore();
const columnData = ref<KanbanColumn>();
const inputCard = ref<boolean>(false);
const cardInput = ref('');
const columnName = computed(() => columnData.value?.name || '');
const isLoadingCards = ref(false);
const cardsInColumn = ref<KanbanCard[]>([]);
const isDragging = ref(false);

const onDragStart = () => {
    isDragging.value = true;
    document.body.classList.add('dragging');
};

const onDragEnd = () => {
    isDragging.value = false;
    document.body.classList.remove('dragging');
};

const onChange = async (event: any) => {
    if (event.added) {
        const card = event.added.element;
        const newIndex = event.added.newIndex;
        const fromColumnId = card.columnId;

        try {
            await kanbanStore.moveCard(card.id, props.listId, newIndex);

            emit('card-moved', {
                cardId: card.id,
                fromColumnId: fromColumnId,
                toColumnId: props.listId,
                newIndex,
                oldIndex: event.added.oldIndex
            });

            await Promise.all([
                kanbanStore.fetchCards(fromColumnId),
                kanbanStore.fetchCards(props.listId)
            ]);
        } catch (error) {
            console.error('Failed to move card:', error);
            await fetchCardsForColumn(props.listId);
        }
    }

    if (event.moved) {
        const card = event.moved.element;
        const newIndex = event.moved.newIndex;
        const oldIndex = event.moved.oldIndex;

        try {
            await kanbanStore.moveCard(card.id, props.listId, newIndex);

            emit('card-moved', {
                cardId: card.id,
                fromColumnId: props.listId,
                toColumnId: props.listId,
                newIndex,
                oldIndex
            });

            await fetchCardsForColumn(props.listId);
        } catch (error) {
            console.error('Failed to move card:', error);
            await fetchCardsForColumn(props.listId);
        }
    }
};

const fetchCardsForColumn = async (columnId: string) => {
    if (!columnId) return;
    isLoadingCards.value = true;
    try {
        await kanbanStore.fetchCards(columnId);
    } catch (error) {
        console.error('Failed to fetch cards:', error);
    } finally {
        isLoadingCards.value = false;
    }
};

const insertCard = () => {
    inputCard.value = true;
};

const addCard = async (columnId: string) => {
    if (cardInput.value.trim()) {
        try {
            const existingCards = kanbanStore.getCardsByColumnId(columnId);
            const nextOrder = existingCards.length > 0 ? Math.max(...existingCards.map(card => card.order)) + 1 : 0;

            if (!authStore.user || !authStore.user.id) {
                throw new Error('User not authenticated');
            }

            await kanbanStore.createCard({
                title: cardInput.value,
                columnId: columnId,
                order: nextOrder,
                reporterId: authStore.user.id,
                priorityId: 1
            });

            cardInput.value = '';
            inputCard.value = false;

            await fetchCardsForColumn(columnId);
        } catch (error) {
            console.error('Failed to create card:', error);
        }
    }
};

const cancelCard = () => {
    cardInput.value = '';
    inputCard.value = false;
};

onMounted(async () => {
    getColumnData(props.listId)
    if (props.listId != '') {
        await fetchCardsForColumn(props.listId);
    }
});

function getColumnData(columnId: string) {
    columnData.value = kanbanStore.getColumnById(columnId);
    return columnData;
}

async function deleteColumn(columnId: string) {
    try {
        kanbanStore.deleteColumn(columnId);
        getColumnData(columnId);
    } catch (err) {
        console.error('Failed to delete column');
    }
}

watch(() => kanbanStore.getCardsByColumnId(props.listId), (newCards) => {
    cardsInColumn.value = [...newCards];
}, { immediate: true, deep: true });

</script>

<template>
    <div
        class="bg-gray-200/60 shadow-xs shadow-gray-600/70 rounded-sm w-2xs border border-grey-300/80 flex flex-col max-h-full">
        <div
            class="flex-shrink-0 flex flex-row items-center justify-between px-2 py-3 font-bold border-b border-gray-300">
            <div class="flex flex-row items-center gap-1 flex-1 min-w-0">
                <div class="column-drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-gray-300 rounded transition-colors flex-shrink-0"
                    title="Drag to reorder column">
                    <GripVertical :size="18" class="text-gray-600" />
                </div>
                <h2 class="truncate flex-1">{{ columnData?.name }}</h2>
                <span class="text-xs bg-gray-400 text-gray-800 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    {{ cardsInColumn.length }}
                </span>
            </div>
            <DialogRoot>
                <DialogTrigger class="hover:bg-gray-200 rounded-xs">
                    <Pencil class="p-1" />
                </DialogTrigger>
                <DialogPortal>
                    <DialogOverlay class="bg-gray-500/60 data-[state=open]:animate-overlayShow fixed inset-0 z-30" />
                    <DialogContent
                        class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] focus:outline-none z-[100] border">
                        <DialogTitle class="font-medium text-lg pb-5">
                            Edit Column
                        </DialogTitle>
                        <DialogDescription></DialogDescription>
                        <fieldset>
                            <div class="flex flex-col space-y-2">
                                <Label class="text-sm">Column Name</Label>
                                <input type="text" v-model="columnName" class="basic-input text-sm" required />
                            </div>
                        </fieldset>
                        <div class="mt-[25px] flex flex-row justify-between">
                            <DialogClose as-child>
                                <button type="button" @click="deleteColumn(props.listId)"
                                    class="bg-red-200 text-red-700 rounded-sm border border-red-500 py-1 px-3 hover:bg-red-300 hover:font-medium">Delete</button>
                            </DialogClose>
                            <div class="justify-end flex flex-row space-x-4">
                                <DialogClose as-child>
                                    <button type="button"
                                        class="flex bg-black text-white py-1 px-3 rounded-sm hover:bg-gray-700/80">
                                        Save
                                    </button>
                                </DialogClose>
                                <DialogClose class="hover:underline">Cancel</DialogClose>
                            </div>
                        </div>
                    </DialogContent>
                </DialogPortal>
            </DialogRoot>
        </div>

        <div class="flex-1 flex flex-col min-h-0 overflow-hidden" v-show="props.listId != ''">
            <draggable v-model="cardsInColumn" :group="{ name: 'kanban', pull: true, put: ['kanban'] }" :animation="200"
                ghost-class="ghost-card" chosen-class="chosen-card" drag-class="drag-card" :disabled="isLoadingCards"
                class="task-list flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 min-h-0" @start="onDragStart"
                @end="onDragEnd" @change="onChange" item-key="id" tag="div" handle=".drag-handle">
                <template #item="{ element: card }">
                    <KanbanCardComp :kanbanCardId="card.id" :project-id="props.projectId" :is-dragging="isDragging" />
                </template>

            </draggable>
            <div class="flex-shrink-0 border-t border-gray-300">
                <div v-if="!inputCard" class="mt-2">
                    <button @click="insertCard"
                        class="flex w-full h-full text-sm hover:underline transition-all duration-100 ease-in bg-gray-200 py-2 px-2 rounded-sm hover:bg-gray-300/90 hover:cursor-pointer">
                        Add Card
                    </button>
                </div>
                <div v-else class="flex flex-col shadow-sm space-y-2 px-2 py-0.5 pb-2 mt-2">
                    <div class="flex flex-col bg-white">
                        <input type="text" name="card-title" id="card-title" class="basic-input h-8"
                            placeholder="Enter card title" @keyup.enter="addCard(props.listId)" v-model="cardInput"
                            required />
                    </div>
                    <div class="flex flex-row space-x-2 px-0.5">
                        <button type="button" @click="addCard(props.listId)"
                            class="bg-black text-white rounded-sm hover:bg-gray-600/90 px-2 text-sm py-0.5 hover:cursor-pointer">
                            Add
                        </button>
                        <button type="button" @click="cancelCard"
                            class="border-gray-700 border rounded-sm px-2 hover:underline text-sm py-0.5 hover:cursor-pointer">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>


<style scoped>
.column-drag-handle {
    touch-action: none;
    user-select: none;
}

.column-drag-handle:active {
    cursor: grabbing !important;
}

.ghost-card {
    opacity: 0.6;
    /*height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;*/
    /*overflow: hidden;*/
}

.chosen-card {
    cursor: grabbing !important;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    transform: scale(1.03);
    z-index: 1000;
    transition: all 0.2s ease;
}

.drag-card {
    opacity: 0.8;
    cursor: grabbing !important;
    transform: rotate(3deg);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.task-list {
    /*min-height: 100px;*/
    max-height: 100%;
    height: fit-content;
    transition: all 0.3s ease;
    overflow-y: auto;
    border: 2px solid transparent;
}


:global(body.dragging) {
    user-select: none;
    cursor: grabbing !important;
}

:global(body.dragging) * {
    cursor: grabbing !important;
}
</style>
