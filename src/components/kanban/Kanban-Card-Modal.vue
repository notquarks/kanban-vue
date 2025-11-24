<script setup lang="ts">
import {
    useKanbanStore,
    type Attachment,
    type CardTodo,
    type CreateCardData,
    type KanbanCard,
    type Label,
} from "@/stores/kanban";
import {
    LayoutList,
    Plus,
    SquareCheckBig,
    TextInitial,
    X,
} from "lucide-vue-next";
import {
    AvatarFallback,
    AvatarRoot,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    ProgressIndicator,
    ProgressRoot,
} from "reka-ui";
import { computed, ref, watch } from "vue";
import KanbanTodo from "./Kanban-Todo.vue";

const props = defineProps<{
    cardData: KanbanCard | undefined;
}>();

const kanbanStore = useKanbanStore();

const emit = defineEmits(["update:card"]);
const editableTitle = ref(props.cardData?.title || "");
const editableDescription = ref(props.cardData?.description || "");
const todos = ref<CardTodo[]>([]);
const attachments = ref<Attachment[]>([]);
const labels = ref<Label[]>([]);
const members = ref<any[]>([]);
const newTodoTitle = ref("");
const openInputTask = ref(false);
const isDescriptionFocused = ref(false);


const progressValue = computed(() => {
    if (!todos.value || todos.value.length === 0) {
        return 0;
    }
    const completedCount = todos.value.filter(t => t.isCompleted).length;
    return (completedCount / todos.value.length) * 100;
});


watch(
    () => props.cardData,
    async (newCardData) => {
        if (newCardData) {
            editableTitle.value = newCardData.title || "";
            editableDescription.value = newCardData.description || "";
            try {
                todos.value = await kanbanStore.fetchCardTodos(newCardData.id);
                attachments.value = await kanbanStore.fetchCardAttachments(
                    newCardData.id,
                );
                labels.value = await kanbanStore.fetchCardLabels(newCardData.id);
                members.value = await kanbanStore.fetchCardMembers(newCardData.id);
            } catch (error) {
                console.error("Error fetching card data:", error);
            }
        }
    },
    { deep: true },
);

const addTask = async () => {
    if (!props.cardData || !newTodoTitle.value.trim()) {
        return;
    }

    try {
        const title = newTodoTitle.value.trim();
        const createdTodoFromStore = await kanbanStore.createCardTodo(
            props.cardData.id,
            title,
            todos.value.length
        );

        const newTodoForUI = {
            ...createdTodoFromStore,
            title: title,
            isCompleted: false
        };
        todos.value = [...todos.value, newTodoForUI];
        newTodoTitle.value = "";
        openInputTask.value = false;
    } catch (error) {
        console.error("Error adding task:", error);
    }
};


const saveData = async () => {
    if (props.cardData) {
        emit("update:card", {
            ...props.cardData,
            description: editableDescription.value,
        });
        const cardUpdateData: Partial<CreateCardData> = {
            title: props.cardData.title,
            description: editableDescription.value || undefined,
            columnId: props.cardData.columnId,
            order: props.cardData.order,
            assigneeId: props.cardData.assigneeId || undefined,
            reporterId: props.cardData.reporterId,
            priorityId: props.cardData.priorityId,
            dueDate: props.cardData.dueDate || undefined,
            status: props.cardData.status,
            estimatedHours: props.cardData.estimatedHours || undefined,
        };
        await kanbanStore.updateCard(props.cardData.id, cardUpdateData);
    }
};

const handleTodoUpdate = async (updatedTodo: { id: string; title: string; isCompleted: boolean }) => {
    try {
        const index = todos.value.findIndex(t => t.id === updatedTodo.id);
        if (index !== -1) {
            const existingTodo = todos.value[index];
            if (existingTodo) {
                todos.value[index] = {
                    id: existingTodo.id,
                    cardId: existingTodo.cardId,
                    title: updatedTodo.title,
                    isCompleted: updatedTodo.isCompleted,
                    order: existingTodo.order,
                    createdAt: existingTodo.createdAt,
                    updatedAt: existingTodo.updatedAt
                };
                console.log(todos.value[index]);
            }
        }
        await kanbanStore.updateCardTodo(updatedTodo.id, {
            isCompleted: updatedTodo.isCompleted
        });
    } catch (error) {
        console.error('Failed to update todo:', error);
    }
};

const handleDeleteTodo = async (id: string) => {
    try {
        await kanbanStore.deleteCardTodo(id);
        const index = todos.value.findIndex(t => t.id === id);
        if (index !== -1) {
            todos.value.splice(index, 1);
        }
    } catch (error) {
        console.error('Failed to delete todo:', error);
    }
};




</script>

<template>
    <DialogPortal>
        <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-gray-700/80" />
        <DialogContent
            class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] z-[100] w-[45dvw] translate-x-[-50%] translate-y-[-50%] rounded-sm bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none">
            <DialogTitle class="m-0 flex flex-row items-center gap-3 text-[17px] font-semibold text-black">
                <LayoutList />
                <input type="text" name="title-input" id="title-input"
                    class="w-[60%] bg-gray-200/60 px-2 py-0.5 focus:border-b focus:outline-gray-400/50"
                    v-model="editableTitle" tabindex="-1" />
            </DialogTitle>
            <div class="grid grid-cols-[65%_35%]">
                <!-- Col 1  -->
                <div class="mt-6 mb-5 flex w-full flex-col gap-6 text-sm leading-normal text-black">
                    <div class="flex flex-col gap-2">
                        <p class="text-lg font-medium">Members</p>
                        <div class="flex flex-row">
                            <AvatarRoot
                                class="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-black align-middle select-none">
                                <AvatarFallback
                                    class="flex h-full w-full items-center justify-center bg-white text-sm leading-1 font-medium text-white dark:bg-stone-800 dark:text-stone-300"
                                    :delay-ms="600">
                                    CT
                                </AvatarFallback>
                            </AvatarRoot>
                        </div>
                    </div>
                    <div class="flex w-full flex-col gap-2">
                        <div class="flex flex-row items-center gap-3">
                            <TextInitial />
                            <p class="text-lg font-medium">Description</p>
                        </div>
                        <DialogDescription class="flex w-full pl-10 flex-col items-start">
                            <textarea name=" desc-input" id="desc-input" v-model="editableDescription"
                                class="h-24 w-full rounded-sm border-none bg-gray-200/60 p-2 focus:border focus:border-gray-600/40 focus:outline-gray-600/40"
                                @focus="isDescriptionFocused = true" placeholder="Add Description" tabindex="-1" />
                            <button v-show="isDescriptionFocused" type="button"
                                @click="() => { saveData(); isDescriptionFocused = false; }"
                                class="mt-2 px-3 py-1 rounded-sm bg-gray-600 text-white hover:bg-gray-700 transition-colors">
                                Save
                            </button>
                        </DialogDescription>
                    </div>
                    <div class="flex w-full flex-col gap-2">
                        <div class="flex flex-row items-center gap-3">
                            <SquareCheckBig />
                            <p class="text-lg font-medium">Task</p>
                        </div>
                        <div class="ml-10" v-show="todos.length">
                            <ProgressRoot :model-value="progressValue"
                                class="rounded-xs relative h-2 w-full overflow-hidden bg-gray-100 border border-muted">
                                <ProgressIndicator
                                    class="indicator rounded-xs block relative w-full h-full bg-green-500 transition-transform overflow-hidden duration-[450ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)] after:animate-progress after:content-[''] after:absolute after:inset-0 after:bg-[length:30px_30px]"
                                    :style="`transform: translateX(-${100 - progressValue}%)`" />
                            </ProgressRoot>
                        </div>
                        <div class="flex flex-col gap-1 pl-10 w-full">
                            <div class="flex w-full flex-col gap-2">
                                <KanbanTodo v-for="todo in todos" :key="todo.id"
                                    :todo="{ id: todo.id, title: todo.title, isCompleted: todo.isCompleted }"
                                    @update:todo="handleTodoUpdate" @delete:todo="handleDeleteTodo" />
                            </div>
                            <div v-show="openInputTask" class="flex flex-row w-full">
                                <input type="text" name="todo-input" id="todo-input" v-model="newTodoTitle"
                                    class="basic-input w-full" @keyup.enter="addTask">
                            </div>
                            <button
                                class="mt-2 flex flex-row items-center justify-center gap-2 rounded-xs border-t border-gray-300 px-3 py-1 font-medium transition-all duration-100 ease-in hover:bg-gray-200"
                                @click="openInputTask = true">
                                <Plus class="p-1" /> Add Task
                            </button>
                        </div>
                    </div>
                </div>
                <!-- Col 2 -->
                <div class="mt-6 flex flex-col items-start gap-4 px-4 pl-10">
                    <div class="flex w-full flex-col items-start gap-2">
                        <p class="text-base">Add to Card</p>
                        <button
                            class="w-full rounded-xs bg-gray-400/40 px-3 py-1 text-left text-sm font-medium text-black/70 hover:bg-gray-500/55">
                            Members
                        </button>
                        <button
                            class="w-full rounded-xs bg-gray-400/40 px-3 py-1 text-left text-sm font-medium text-black/70 hover:bg-gray-500/55">
                            Labels
                        </button>
                        <button
                            class="w-full rounded-xs bg-gray-400/40 px-3 py-1 text-left text-sm font-medium text-black/70 hover:bg-gray-500/55">
                            Due Date
                        </button>
                        <button
                            class="w-full rounded-xs bg-gray-400/40 px-3 py-1 text-left text-sm font-medium text-black/70 hover:bg-gray-500/55">
                            Attachments
                        </button>
                    </div>
                    <div class="flex w-full flex-col gap-2">
                        <p>Actions</p>
                        <button
                            class="w-full rounded-xs bg-red-400/40 px-3 py-1 text-left text-sm font-medium text-black/70 hover:bg-red-500/55">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
            <DialogClose
                class="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full text-black hover:cursor-pointer hover:bg-gray-800/70 hover:text-white focus:shadow-[0_0_0_2px] focus:shadow-black focus:outline-none"
                aria-label="Close">
                <X class="m-1" />
            </DialogClose>
        </DialogContent>
    </DialogPortal>
</template>

<style scoped></style>
