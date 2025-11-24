<script setup lang="ts">
import {
    useKanbanStore,
    type Attachment,
    type CardTodo,
    type CreateCardData,
    type KanbanCard,
    type Label,
} from "@/stores/kanban";
import { useProjectsStore } from "@/stores/projects";
import type { SafeUser } from "@/types";
import {
    LayoutList,
    Plus,
    SquareCheckBig,
    TextInitial,
    UserPlus,
    X,
    Tag,
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
    projectId: string;
}>();

const kanbanStore = useKanbanStore();
const projectsStore = useProjectsStore();

const emit = defineEmits(["update:card"]);
const editableTitle = ref(props.cardData?.title || "");
const editableDescription = ref(props.cardData?.description || "");
const todos = ref<CardTodo[]>([]);
const attachments = ref<Attachment[]>([]);
const labels = ref<Label[]>([]);
const members = ref<SafeUser[]>([]);
const projectTeamMembers = ref<SafeUser[]>([]);
const showMemberDropdown = ref(false);
const showLabelDropdown = ref(false);
const allLabels = ref<Label[]>([]);
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
                allLabels.value = await kanbanStore.fetchLabels();
                const cardMembers = await kanbanStore.fetchCardMembers(newCardData.id);
                projectTeamMembers.value = await projectsStore.fetchProjectTeamMembers(props.projectId);

                const memberIds = cardMembers.map(cm => cm.userId);
                members.value = projectTeamMembers.value.filter(user => memberIds.includes(user.id));
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

        try {
            await kanbanStore.updateCard(props.cardData.id, cardUpdateData);
            emit("update:card", {
                ...props.cardData,
                description: editableDescription.value,
            });
        } catch (error) {
            console.error("Error updating card description:", error);
        }
    }
};

const updateTitle = async () => {
    if (props.cardData && editableTitle.value !== props.cardData.title) {
        const cardUpdateData: Partial<CreateCardData> = {
            title: editableTitle.value,
            description: props.cardData.description || undefined,
            columnId: props.cardData.columnId,
            order: props.cardData.order,
            assigneeId: props.cardData.assigneeId || undefined,
            reporterId: props.cardData.reporterId,
            priorityId: props.cardData.priorityId,
            dueDate: props.cardData.dueDate || undefined,
            status: props.cardData.status,
            estimatedHours: props.cardData.estimatedHours || undefined,
        };

        try {
            await kanbanStore.updateCard(props.cardData.id, cardUpdateData);
            emit("update:card", {
                ...props.cardData,
                title: editableTitle.value,
            });
        } catch (error) {
            console.error("Error updating card title:", error);
            editableTitle.value = props.cardData.title;
        }
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

const availableMembers = computed(() => {
    return projectTeamMembers.value.filter((teamMember) => {
        return !members.value.some((member) => member.id === teamMember.id);
    });
});

const addMember = async (user: SafeUser) => {
    if (!props.cardData) return;

    try {
        await kanbanStore.addCardMember(props.cardData.id, user.id);

        // Update local store state
        const cardInStore = kanbanStore.cards.find(c => c.id === props.cardData!.id);
        if (cardInStore) {
            if (!cardInStore.members) cardInStore.members = [];
            if (!cardInStore.members.some(m => m.id === user.id)) {
                cardInStore.members.push(user);
            }
        }

        members.value.push(user);
        showMemberDropdown.value = false;
        emit("update:card", {
            ...props.cardData,
            members: members.value
        });
    } catch (error) {
        console.error('Failed to add member:', error);
    }
};

const removeMember = async (userId: string) => {
    if (!props.cardData) return;

    try {
        await kanbanStore.removeCardMember(props.cardData.id, userId);

        // Update local store state
        const cardInStore = kanbanStore.cards.find(c => c.id === props.cardData!.id);
        if (cardInStore && cardInStore.members) {
            cardInStore.members = cardInStore.members.filter(m => m.id !== userId);
        }

        members.value = members.value.filter(m => m.id !== userId);
        emit("update:card", {
            ...props.cardData,
            members: members.value
        });
    } catch (error) {
        console.error('Failed to remove member:', error);
    }
};

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
};

const isLabelAssigned = (labelId: string) => {
    return labels.value.some(l => l.id === labelId);
};

const toggleLabel = async (label: Label) => {
    if (!props.cardData) return;

    try {
        if (isLabelAssigned(label.id)) {
            await kanbanStore.removeCardLabel(props.cardData.id, label.id);
            labels.value = labels.value.filter(l => l.id !== label.id);
        } else {
            await kanbanStore.addCardLabel(props.cardData.id, label.id);
            labels.value.push(label);
        }

        emit("update:card", {
            ...props.cardData,
            labels: labels.value
        });
    } catch (error) {
        console.error('Failed to toggle label:', error);
    }
};
</script>

<template>
    <DialogPortal>
        <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-gray-700/80" />
        <DialogContent
            class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] z-[100] w-[45dvw] translate-x-[-50%] translate-y-[-50%] rounded-sm bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none">
            <DialogTitle class="m-0 flex flex-row items-center gap-3 text-[17px] font-semibold text-black mb-4">
                <LayoutList />
                <input type="text" name="title-input" id="title-input"
                    class="w-[90%] bg-transparent px-2 py-0.5 focus:bg-white focus:border-b focus:outline-gray-400/50 text-xl font-bold"
                    v-model="editableTitle" tabindex="-1" @blur="updateTitle" />
            </DialogTitle>
            <div class="grid grid-cols-[70%_30%] gap-4">
                <div class="flex w-full flex-col gap-6 text-sm leading-normal text-black">
                    <div class="flex flex-wrap gap-6 pl-10">
                        <div class="flex flex-col gap-1.5">
                            <p class="text-xs font-semibold text-gray-500 uppercase">Members</p>
                            <div class="flex flex-row gap-1 flex-wrap items-center">
                                <div v-for="member in members" :key="member.id" class="relative group">
                                    <AvatarRoot
                                        class="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-700 align-middle select-none hover:opacity-90 cursor-pointer">
                                        <AvatarFallback
                                            class="flex h-full w-full items-center justify-center text-xs font-semibold text-white"
                                            :title="member.name">
                                            {{ getInitials(member.name) }}
                                        </AvatarFallback>
                                    </AvatarRoot>
                                    <button @click="removeMember(member.id)"
                                        class="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 z-10"
                                        :title="`Remove ${member.name}`">
                                        <X :size="8" />
                                    </button>
                                </div>
                                <div class="relative">
                                    <button @click="showMemberDropdown = !showMemberDropdown"
                                        class="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors">
                                        <Plus :size="16" />
                                    </button>

                                    <div v-if="showMemberDropdown"
                                        class="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-xl z-20 max-h-64 overflow-y-auto">
                                        <div class="p-2 border-b border-gray-100">
                                            <p class="text-xs font-semibold text-gray-500 text-center">Members</p>
                                        </div>
                                        <div v-if="availableMembers.length === 0"
                                            class="px-3 py-4 text-sm text-gray-500 text-center">
                                            All team members added
                                        </div>
                                        <button v-for="user in availableMembers" :key="user.id" @click="addMember(user)"
                                            class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors">
                                            <AvatarRoot
                                                class="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-700 align-middle select-none flex-shrink-0">
                                                <AvatarFallback
                                                    class="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                                                    {{ getInitials(user.name) }}
                                                </AvatarFallback>
                                            </AvatarRoot>
                                            <span class="text-gray-700">{{ user.name }}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col gap-1.5">
                            <p class="text-xs font-semibold text-gray-500 uppercase">Labels</p>
                            <div class="flex flex-row gap-1 flex-wrap items-center">
                                <div v-for="label in labels" :key="label.id"
                                    class="h-8 px-3 rounded-sm flex items-center justify-center text-white text-sm font-medium min-w-[60px] hover:opacity-90 cursor-pointer transition-opacity"
                                    :style="{ backgroundColor: label.color }">
                                    {{ label.name }}
                                </div>
                                <div class="relative">
                                    <button @click="showLabelDropdown = !showLabelDropdown"
                                        class="h-8 w-8 rounded-sm bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors">
                                        <Plus :size="16" />
                                    </button>

                                    <div v-if="showLabelDropdown"
                                        class="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-xl z-20 flex flex-col">
                                        <div class="p-2 border-b border-gray-100 flex items-center justify-between">
                                            <span class="w-4"></span>
                                            <p class="text-xs font-semibold text-gray-500">Labels</p>
                                            <button @click="showLabelDropdown = false"
                                                class="text-gray-400 hover:text-gray-600">
                                                <X :size="14" />
                                            </button>
                                        </div>
                                        <div class="p-2">
                                            <input type="text" placeholder="Search labels..."
                                                class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-gray-50" />
                                        </div>
                                        <div class="p-2 flex flex-col gap-1 max-h-64 overflow-y-auto">
                                            <p class="text-xs font-semibold text-gray-500 mb-1">Labels</p>
                                            <div v-if="allLabels.length === 0"
                                                class="px-2 py-2 text-sm text-gray-500 text-center">
                                                No labels available
                                            </div>
                                            <div v-for="label in allLabels" :key="label.id"
                                                class="flex items-center gap-2 group">
                                                <button @click="toggleLabel(label)"
                                                    class="flex-1 h-8 px-2 rounded-sm text-left text-sm font-medium text-white hover:opacity-90 transition-opacity flex items-center justify-between relative overflow-hidden"
                                                    :style="{ backgroundColor: label.color }">
                                                    <span class="truncate">{{ label.name }}</span>
                                                    <div v-if="isLabelAssigned(label.id)"
                                                        class="flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                                            fill="none" stroke="currentColor" stroke-width="3"
                                                            stroke-linecap="round" stroke-linejoin="round"
                                                            class="w-4 h-4 text-white">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
                                                    </div>
                                                </button>
                                                <button
                                                    class="p-1.5 text-gray-400 hover:bg-gray-100 rounded-sm hover:text-gray-600 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <path
                                                            d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z">
                                                        </path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="p-2 border-t border-gray-100 bg-gray-50 rounded-b-md">
                                            <button
                                                class="w-full py-1 text-sm text-gray-600 hover:text-gray-800 hover:underline text-left px-1">
                                                Create new label
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col gap-1.5" v-if="props.cardData?.dueDate">
                            <p class="text-xs font-semibold text-gray-500 uppercase">Due Date</p>
                            <div class="flex items-center gap-2 h-8 px-3 bg-gray-200 rounded-sm text-sm text-gray-700">
                                <span>{{ new Date(props.cardData.dueDate).toLocaleDateString() }}</span>
                                <span
                                    class="bg-yellow-300 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded-xs uppercase"
                                    v-if="new Date(props.cardData.dueDate) < new Date()">Overdue</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex w-full flex-col gap-2">
                        <div class="flex flex-row items-center gap-3">
                            <TextInitial />
                            <p class="text-lg font-medium">Description</p>
                        </div>
                        <DialogDescription class="flex w-full pl-10 flex-col items-start">
                            <textarea name=" desc-input" id="desc-input" v-model="editableDescription"
                                class="min-h-[100px] w-full rounded-sm border-none bg-gray-100 p-3 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-y"
                                @focus="isDescriptionFocused = true" placeholder="Add a more detailed description..."
                                tabindex="-1" />
                            <div v-show="isDescriptionFocused" class="flex items-center gap-2 mt-2">
                                <button type="button" @click="() => { saveData(); isDescriptionFocused = false; }"
                                    class="px-4 py-1.5 rounded-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">
                                    Save
                                </button>
                                <button type="button" @click="isDescriptionFocused = false"
                                    class="px-4 py-1.5 rounded-sm text-gray-600 hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                            </div>
                        </DialogDescription>
                    </div>
                    <div class="flex w-full flex-col gap-2">
                        <div class="flex flex-row items-center gap-3">
                            <SquareCheckBig />
                            <p class="text-lg font-medium">Task</p>
                        </div>
                        <div class="ml-10" v-show="todos.length">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-xs font-semibold text-gray-500">{{ Math.round(progressValue)
                                    }}%</span>
                                <ProgressRoot :model-value="progressValue"
                                    class="rounded-full relative h-1.5 w-full overflow-hidden bg-gray-200">
                                    <ProgressIndicator
                                        class="indicator rounded-full block relative w-full h-full bg-green-500 transition-transform overflow-hidden duration-[450ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)]"
                                        :style="`transform: translateX(-${100 - progressValue}%)`" />
                                </ProgressRoot>
                            </div>
                        </div>
                        <div class="flex flex-col gap-1 pl-10 w-full">
                            <div class="flex w-full flex-col gap-2">
                                <KanbanTodo v-for="todo in todos" :key="todo.id"
                                    :todo="{ id: todo.id, title: todo.title, isCompleted: todo.isCompleted }"
                                    @update:todo="handleTodoUpdate" @delete:todo="handleDeleteTodo" />
                            </div>
                            <div v-show="openInputTask" class="flex flex-col gap-2 w-full mt-2">
                                <input type="text" name="todo-input" id="todo-input" v-model="newTodoTitle"
                                    class="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Add an item" @keyup.enter="addTask">
                                <div class="flex items-center gap-2">
                                    <button @click="addTask"
                                        class="px-4 py-1.5 bg-blue-600 text-white rounded-sm hover:bg-blue-700 font-medium">Add</button>
                                    <button @click="openInputTask = false"
                                        class="px-4 py-1.5 text-gray-600 hover:bg-gray-200 rounded-sm">Cancel</button>
                                </div>
                            </div>
                            <button v-if="!openInputTask"
                                class="mt-2 flex flex-row items-center gap-2 rounded-sm bg-gray-100 px-3 py-1.5 font-medium text-gray-700 transition-all duration-100 ease-in hover:bg-gray-200 w-fit"
                                @click="openInputTask = true">
                                <Plus class="w-4 h-4" /> Add an item
                            </button>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-start gap-4 px-2">
                    <div class="flex w-full flex-col items-start gap-2">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Add to Card</p>

                        <button @click="showMemberDropdown = !showMemberDropdown"
                            class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 flex items-center gap-2 transition-colors relative">
                            <UserPlus :size="14" />
                            Members
                        </button>

                        <button @click="showLabelDropdown = !showLabelDropdown"
                            class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 flex items-center gap-2 transition-colors relative">
                            <Tag :size="14" />
                            Labels
                        </button>

                        <button
                            class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 flex items-center gap-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            Due Date
                        </button>

                        <button
                            class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 flex items-center gap-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path
                                    d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48">
                                </path>
                            </svg>
                            Attachments
                        </button>
                    </div>
                    <div class="flex w-full flex-col gap-2 mt-4">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Actions</p>
                        <button
                            class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                stroke-linejoin="round">
                                <path d="M3 6h18"></path>
                                <path
                                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                                </path>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
            <DialogClose
                class="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full text-gray-500 hover:cursor-pointer hover:bg-gray-100 hover:text-black focus:outline-none"
                aria-label="Close">
                <X class="w-5 h-5" />
            </DialogClose>
        </DialogContent>
    </DialogPortal>
</template>

<style scoped></style>
