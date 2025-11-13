<script setup lang="ts">
import { useKanbanStore, type KanbanCard, type KanbanColumn } from '@/stores/kanban';
import { useAuthStore } from '@/stores/auth';
import { Pencil } from 'lucide-vue-next';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger, Label, ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui';
import { computed, onMounted, ref, watch } from 'vue';
import KanbanCardComp from './Kanban-Card.vue';


const props = defineProps<{
    projectId: string;
    listId: string;
    isLoading: boolean;
}>();

const kanbanStore = useKanbanStore();
const authStore = useAuthStore();
const columnData = ref<KanbanColumn>();
const inputCard = ref<boolean>(false);
const cardInput = ref('');
const columnName = computed(() => columnData.value?.name || '');
const isLoadingCards = ref(false);
const cardsInColumn = ref<KanbanCard[]>([]);

const fetchCardsForColumn = async (columnId: string) => {
    if (!columnId) return;
    isLoadingCards.value = true;
    try {
        const response = await kanbanStore.fetchCards(columnId);
        cardsInColumn.value = response;
        console.log('cardsInColumn data: ', cardsInColumn.value)
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

function getCardId(columnId: string) {
    return kanbanStore.getCardsByColumnId(columnId);
}

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

watch(() => props.listId, (newId) => {
    console.log(`Kanban-List for listId: ${newId}`);
}, { immediate: true })

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
            <ScrollAreaRoot style="--scrollbar-size: 10px" class="relative rounded-lg h-fit max-h-dvh overflow-hidden">
                <ScrollAreaViewport class="w-full h-full rounded px-2">
                    <KanbanCardComp v-for="kanbanCard in cardsInColumn" :key="kanbanCard.id"
                        :kanbanCardId="kanbanCard.id" />
                </ScrollAreaViewport>
                <ScrollAreaScrollbar
                    class="flex select-none touch-none p-0.5 z-20 bg-gray-800/90 transition-colors duration-[160ms] ease-out hover:bg-gray-700/80 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
                    orientation="vertical">
                    <ScrollAreaThumb
                        class="flex-1 bg-gray-200 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
                </ScrollAreaScrollbar>
            </ScrollAreaRoot>
            <button @click="insertCard" v-if="!inputCard"
                class="flex w-full h-full text-sm hover:underline transition-all duration-100 ease-in bg-gray-200 py-2 px-2 rounded-sm hover:bg-gray-300/90 hover:cursor-pointer">
                Add Card
            </button>
            <div class="flex flex-col shadow-sm space-y-2 px-2 py-0.5 pb-2" v-else>
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
</template>

<style lang="">

</style>
