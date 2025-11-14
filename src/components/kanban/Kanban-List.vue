<script setup lang="ts">
import { useKanbanStore, type KanbanCard, type KanbanColumn } from '@/stores/kanban';
import { useAuthStore } from '@/stores/auth';
import { Pencil } from 'lucide-vue-next';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger, Label } from 'reka-ui';
import draggable from 'vuedraggable'
import { computed, onMounted, ref, watch } from 'vue';
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
    console.log('Drag started');
    isDragging.value = true;
    document.body.classList.add('dragging');
};

const onDragEnd = () => {
    console.log('Drag ended');
    isDragging.value = false;
    document.body.classList.remove('dragging');
};

const onChange = async (event: any) => {
    console.log('Change event:', event);

    // If card was added to this column from another column
    if (event.added) {
        const card = event.added.element;
        const newIndex = event.added.newIndex;
        const fromColumnId = card.columnId;

        console.log('Card added:', card.id, 'from', fromColumnId, 'to', props.listId, 'at index', newIndex);

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

    // If card was moved within the same column
    if (event.moved) {
        const card = event.moved.element;
        const newIndex = event.moved.newIndex;
        const oldIndex = event.moved.oldIndex;

        console.log('Card moved within column:', card.id, 'from index', oldIndex, 'to', newIndex);

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

// Watch for changes in the store and update local state
watch(() => kanbanStore.getCardsByColumnId(props.listId), (newCards) => {
    cardsInColumn.value = [...newCards];
}, { immediate: true, deep: true });

</script>

<template>
    <div class="bg-gray-200/60 shadow-xs shadow-gray-600/70 rounded-sm w-2xs border border-grey-300/80">
        <div class="flex flex-row justify-between px-2 py-3 font-bold">
            <h2>{{ columnData?.name }}</h2>
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

        <div class="flex flex-col gap-2" v-show="props.listId != ''">
            <draggable v-model="cardsInColumn" :group="{ name: 'kanban', pull: true, put: true }" :animation="200"
                ghost-class="ghost-card" chosen-class="chosen-card" drag-class="drag-card" :disabled="isLoadingCards"
                class="task-list ease-in px-2 py-2" @start="onDragStart" @end="onDragEnd" @change="onChange"
                item-key="id" tag="div">
                <template #item="{ element: card }">
                    <KanbanCardComp :kanbanCardId="card.id" :is-dragging="isDragging" />
                </template>
                <template #footer>
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
                </template>
            </draggable>
        </div>

    </div>
</template>

<style scoped>
.ghost-card {
    opacity: 0.5;
    background: #e3f2fd;
    transform: rotate(2deg);
    border: 2px dashed #2196f3;
}

.chosen-card {
    transform: scale(1.02);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    z-index: 1000;
}

.drag-card {
    opacity: 0.9;
    transform: rotate(5deg);
}

:global(body.dragging) .task-list {
    background-color: #f9f9f9;
}

.task-list {
    min-height: 100px;
    transition: background-color 0.2s ease;
}

.task-list:focus-within {
    outline: 2px solid #2196f3;
    outline-offset: 2px;
}

:global(body.dragging) {
    user-select: none;
    cursor: grabbing;
}
</style>