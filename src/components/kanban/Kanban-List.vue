<script setup lang="ts">
import { useKanbanStore, type KanbanCard, type KanbanColumn } from '@/stores/kanban';
import { Pencil } from 'lucide-vue-next';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger, Label } from 'radix-vue';
import { computed, onMounted, ref } from 'vue';
import KanbanCardComp from './Kanban-Card.vue';


const props = defineProps<{
    projectId: string;
    listId: string;
    isLoading: boolean;
}>();

const kanbanStore = useKanbanStore();
const columnData = ref<KanbanColumn>();
const inputCard = ref<boolean>(false);
const cardInput = ref('');
const columnName = computed(() => columnData.value?.name || '');

const insertCard = () => {
    inputCard.value = true;
};

const addCard = () => {
    if (cardInput.value.trim()) {
        cardInput.value = '';
        inputCard.value = false;
    }
};

const cancelCard = () => {
    cardInput.value = '';
    inputCard.value = false;
};

function getCardId(columnId: string) {
    return kanbanStore.getCardsByColumnId(columnId);
}

onMounted(() => {
    getColumnData(props.listId)
    if (props.listId != '') {
        kanbanStore.fetchCards(props.listId);
    }
});

function getColumnData(columnId: string) {
    columnData.value = kanbanStore.getColumnById(columnId);
    return columnData;
}



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
                        <div class="mt-[25px] flex justify-end space-x-4">
                            <DialogClose as-child>
                                <button type="button"
                                    class="flex bg-black text-white py-1 px-3 rounded-sm hover:bg-gray-700/80">
                                    Save
                                </button>
                            </DialogClose>
                            <DialogClose class="hover:underline">Cancel</DialogClose>
                        </div>
                    </DialogContent>
                </DialogPortal>
            </DialogRoot>
        </div>

        <div class="flex flex-col gap-2" v-show="props.listId != ''">
            <KanbanCardComp class="px-2" :kanbanCard="kanbanCard" v-for="(kanbanCard, index) in getCardId(props.listId)"
                :key="index" />
            <button @click="insertCard" v-if="!inputCard"
                class="flex w-full h-full text-sm hover:underline transition-all duration-100 ease-in bg-gray-200 py-2 px-2 rounded-sm hover:bg-gray-300/90 hover:cursor-pointer">
                Add Card
            </button>
            <div class="flex flex-col shadow-sm space-y-2 px-2 py-3" v-else>
                <div class="flex flex-col bg-white">
                    <input type="text" name="card-title" id="card-title" class="basic-input h-8"
                        placeholder="Enter card title" @keyup.enter="addCard" v-model="cardInput" required />
                </div>
                <div class="flex flex-row space-x-2">
                    <button type="button" @click="addCard"
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
