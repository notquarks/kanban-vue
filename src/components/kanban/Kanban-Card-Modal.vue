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
    Calendar,
    Check,
    LayoutList,
    Paperclip,
    Pencil,
    Plus,
    SquareCheckBig,
    TextInitial,
    Trash2,
    UserPlus,
    X,
    Tag,
    Eye,
    Download,
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
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRoot,
    DropdownMenuTrigger,
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
const allLabels = ref<Label[]>([]);
const newTodoTitle = ref("");
const openInputTask = ref(false);
const isDescriptionFocused = ref(false);
const editingDueDate = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const uploadProgress = ref(0);
const isUploading = ref(false);
const previewAttachment = ref<Attachment | null>(null);
const showPreview = ref(false);

const progressValue = computed(() => {
    if (!todos.value?.length) return 0;
    const completedCount = todos.value.filter(t => t.isCompleted).length;
    return (completedCount / todos.value.length) * 100;
});

const availableMembers = computed(() =>
    projectTeamMembers.value.filter(teamMember =>
        !members.value.some(member => member.id === teamMember.id)
    )
);

const buildCardUpdateData = (overrides: Partial<CreateCardData> = {}): Partial<CreateCardData> => {
    if (!props.cardData) return {};
    return {
        title: props.cardData.title,
        description: props.cardData.description || undefined,
        columnId: props.cardData.columnId,
        order: props.cardData.order,
        assigneeId: props.cardData.assigneeId || undefined,
        reporterId: props.cardData.reporterId,
        priorityId: props.cardData.priorityId,
        dueDate: props.cardData.dueDate || undefined,
        status: props.cardData.status,
        estimatedHours: props.cardData.estimatedHours || undefined,
        ...overrides,
    };
};

const updateCardInStore = (userId: string, action: 'add' | 'remove') => {
    const cardInStore = kanbanStore.cards.find(c => c.id === props.cardData?.id);
    if (!cardInStore) return;

    if (action === 'add') {
        if (!cardInStore.members) cardInStore.members = [];
        const user = projectTeamMembers.value.find(u => u.id === userId);
        if (user && !cardInStore.members.some(m => m.id === userId)) {
            cardInStore.members.push(user);
        }
    } else {
        if (cardInStore.members) {
            cardInStore.members = cardInStore.members.filter(m => m.id !== userId);
        }
    }
};

watch(
    () => props.cardData,
    async (newCardData) => {
        if (!newCardData) return;

        editableTitle.value = newCardData.title || "";
        editableDescription.value = newCardData.description || "";

        try {
            const [fetchedTodos, fetchedAttachments, fetchedLabels, fetchedAllLabels, cardMembers, teamMembers] =
                await Promise.all([
                    kanbanStore.fetchCardTodos(newCardData.id),
                    kanbanStore.fetchCardAttachments(newCardData.id),
                    kanbanStore.fetchCardLabels(newCardData.id),
                    kanbanStore.fetchLabels(),
                    kanbanStore.fetchCardMembers(newCardData.id),
                    projectsStore.fetchProjectTeamMembers(props.projectId),
                ]);

            todos.value = fetchedTodos;
            attachments.value = fetchedAttachments;
            labels.value = fetchedLabels;
            allLabels.value = fetchedAllLabels;
            projectTeamMembers.value = teamMembers;

            const memberIds = cardMembers.map(cm => cm.userId);
            members.value = teamMembers.filter(user => memberIds.includes(user.id));
        } catch (error) {
            console.error("Error fetching card data:", error);
        }
    },
    { deep: true }
);

const updateTitle = async () => {
    if (!props.cardData || editableTitle.value === props.cardData.title) return;

    const cardUpdateData = buildCardUpdateData({ title: editableTitle.value });

    try {
        await kanbanStore.updateCard(props.cardData.id, cardUpdateData);
        emit("update:card", { ...props.cardData, title: editableTitle.value });
    } catch (error) {
        console.error("Error updating card title:", error);
        editableTitle.value = props.cardData.title;
    }
};

const saveData = async () => {
    if (!props.cardData) return;

    const cardUpdateData = buildCardUpdateData({ description: editableDescription.value || undefined });

    try {
        await kanbanStore.updateCard(props.cardData.id, cardUpdateData);
        emit("update:card", { ...props.cardData, description: editableDescription.value });
    } catch (error) {
        console.error("Error updating card description:", error);
    }
};

const addTask = async () => {
    if (!props.cardData || !newTodoTitle.value.trim()) return;

    try {
        const title = newTodoTitle.value.trim();
        const createdTodo = await kanbanStore.createCardTodo(
            props.cardData.id,
            title,
            todos.value.length
        );

        todos.value.push({ ...createdTodo, title, isCompleted: false });
        newTodoTitle.value = "";
        openInputTask.value = false;
        emit("update:card", props.cardData);
    } catch (error) {
        console.error("Error adding task:", error);
    }
};

const handleTodoUpdate = async (updatedTodo: { id: string; title: string; isCompleted: boolean }) => {
    const index = todos.value.findIndex(t => t.id === updatedTodo.id);
    if (index === -1) return;

    const existingTodo = todos.value[index];
    try {
        todos.value[index] = {
            ...existingTodo,
            title: updatedTodo.title,
            isCompleted: updatedTodo.isCompleted
        } as CardTodo;
        await kanbanStore.updateCardTodo(updatedTodo.id, { isCompleted: updatedTodo.isCompleted });
        emit("update:card", props.cardData);
    } catch (error) {
        console.error('Failed to update todo:', error);
    }
};

const handleDeleteTodo = async (id: string) => {
    try {
        await kanbanStore.deleteCardTodo(id);
        todos.value = todos.value.filter(t => t.id !== id);
        emit("update:card", props.cardData);
    } catch (error) {
        console.error('Failed to delete todo:', error);
    }
};

const addMember = async (user: SafeUser) => {
    if (!props.cardData) return;

    try {
        await kanbanStore.addCardMember(props.cardData.id, user.id);
        updateCardInStore(user.id, 'add');
        members.value.push(user);
        emit("update:card", { ...props.cardData, members: members.value });
    } catch (error) {
        console.error('Failed to add member:', error);
    }
};

const removeMember = async (userId: string) => {
    if (!props.cardData) return;

    try {
        await kanbanStore.removeCardMember(props.cardData.id, userId);
        updateCardInStore(userId, 'remove');
        members.value = members.value.filter(m => m.id !== userId);
        emit("update:card", { ...props.cardData, members: members.value });
    } catch (error) {
        console.error('Failed to remove member:', error);
    }
};

const toggleLabel = async (label: Label) => {
    if (!props.cardData) return;

    try {
        const isAssigned = labels.value.some(l => l.id === label.id);

        if (isAssigned) {
            await kanbanStore.removeCardLabel(props.cardData.id, label.id);
            labels.value = labels.value.filter(l => l.id !== label.id);
        } else {
            await kanbanStore.addCardLabel(props.cardData.id, label.id);
            labels.value.push(label);
        }

        emit("update:card", { ...props.cardData, labels: labels.value });
    } catch (error) {
        console.error('Failed to toggle label:', error);
    }
};

const updateDueDate = async (newDate: string | null) => {
    if (!props.cardData) return;

    const dateValue = newDate ? new Date(newDate) : null;
    const cardUpdateData = buildCardUpdateData({ dueDate: dateValue || undefined });

    try {
        await kanbanStore.updateCard(props.cardData.id, cardUpdateData);
        if (props.cardData) {
            props.cardData.dueDate = dateValue;
        }
        editingDueDate.value = false;
        emit("update:card", props.cardData);
    } catch (error) {
        console.error('Failed to update due date:', error);
    }
};

const handleFileUpload = async (event: Event) => {
    if (!props.cardData) return;

    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    isUploading.value = true;
    uploadProgress.value = 0;

    try {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                uploadProgress.value = (e.loaded / e.total) * 100;
            }
        });
        const uploadPromise = new Promise<Attachment>((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.attachment);
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };
            xhr.onerror = () => reject(new Error('Upload failed'));
        });

        // Get auth token
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

        xhr.open('POST', `${apiUrl}/api/cards/${props.cardData.id}/attachments`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);

        const newAttachment = await uploadPromise;
        attachments.value.push(newAttachment);
        emit("update:card", props.cardData);

        if (fileInput.value) {
            fileInput.value.value = '';
        }
    } catch (error) {
        console.error('Failed to upload attachment:', error);
    } finally {
        isUploading.value = false;
        uploadProgress.value = 0;
    }
};

const deleteAttachment = async (attachmentId: string) => {
    if (!props.cardData) return;

    try {
        await kanbanStore.deleteCardAttachment(props.cardData.id, attachmentId);
        attachments.value = attachments.value.filter(a => a.id !== attachmentId);
        emit("update:card", props.cardData);
    } catch (error) {
        console.error('Failed to delete attachment:', error);
    }
};

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getInitials = (name: string): string =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const isLabelAssigned = (labelId: string) =>
    labels.value.some(l => l.id === labelId);

const isImageFile = (filetype: string | null | undefined): boolean => {
    if (!filetype) return false;
    return filetype.startsWith('image/');
};

const openPreview = (attachment: Attachment) => {
    previewAttachment.value = attachment;
    showPreview.value = true;
};

const closePreview = () => {
    showPreview.value = false;
    previewAttachment.value = null;
};

const downloadAttachment = (attachment: Attachment) => {
    window.open(attachment.url, '_blank');
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
                                <DropdownMenuRoot>
                                    <DropdownMenuTrigger
                                        class="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors">
                                        <Plus :size="16" />
                                    </DropdownMenuTrigger>

                                    <DropdownMenuPortal>
                                        <DropdownMenuContent side="bottom" :side-offset="5" align="start"
                                            class="w-64 bg-white border border-gray-200 rounded-md shadow-xl z-[100] max-h-64 overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                                            <DropdownMenuLabel class="p-2 border-b border-gray-100">
                                                <p class="text-xs font-semibold text-gray-500 text-center">Members</p>
                                            </DropdownMenuLabel>
                                            <div v-if="availableMembers.length === 0"
                                                class="px-3 py-4 text-sm text-gray-500 text-center">
                                                All team members added
                                            </div>
                                            <DropdownMenuItem v-for="user in availableMembers" :key="user.id"
                                                @click="addMember(user)"
                                                class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer outline-none">
                                                <AvatarRoot
                                                    class="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-700 align-middle select-none flex-shrink-0">
                                                    <AvatarFallback
                                                        class="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                                                        {{ getInitials(user.name) }}
                                                    </AvatarFallback>
                                                </AvatarRoot>
                                                <span class="text-gray-700">{{ user.name }}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuRoot>
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
                                <DropdownMenuRoot>
                                    <DropdownMenuTrigger
                                        class="h-8 w-8 rounded-sm bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors">
                                        <Plus :size="16" />
                                    </DropdownMenuTrigger>

                                    <DropdownMenuPortal>
                                        <DropdownMenuContent side="bottom" :side-offset="5" align="start"
                                            class="w-72 bg-white border border-gray-200 rounded-md shadow-xl z-[100] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                                            <DropdownMenuLabel class="p-2 border-b border-gray-100">
                                                <p class="text-xs font-semibold text-gray-500 text-center">Labels</p>
                                            </DropdownMenuLabel>
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
                                                    <DropdownMenuItem @click="toggleLabel(label)"
                                                        class="flex-1 h-8 px-2 rounded-sm text-left text-sm font-medium text-white hover:opacity-90 transition-opacity flex items-center justify-between relative overflow-hidden cursor-pointer outline-none"
                                                        :style="{ backgroundColor: label.color }">
                                                        <span class="truncate">{{ label.name }}</span>
                                                        <Check v-if="isLabelAssigned(label.id)" :size="16"
                                                            class="text-white" :stroke-width="3" />
                                                    </DropdownMenuItem>
                                                    <button
                                                        class="p-1.5 text-gray-400 hover:bg-gray-100 rounded-sm hover:text-gray-600 transition-colors">
                                                        <Pencil :size="14" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="p-2 border-t border-gray-100 bg-gray-50 rounded-b-md">
                                                <button
                                                    class="w-full py-1 text-sm text-gray-600 hover:text-gray-800 hover:underline text-left px-1">
                                                    Create new label
                                                </button>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuRoot>
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

                    <div v-if="attachments.length > 0 || isUploading" class="flex flex-col gap-2">
                        <div class="flex items-center gap-2">
                            <Paperclip />
                            <p class="text-lg font-medium">Attachments</p>
                        </div>
                        <div class="flex flex-col gap-1 pl-8">
                            <div v-for="attachment in attachments" :key="attachment.id"
                                class="flex items-center justify-between p-2 bg-gray-50 rounded-sm hover:bg-gray-100 transition-colors">
                                <div class="flex items-center gap-2 flex-1 min-w-0">
                                    <Paperclip :size="14" class="text-gray-400 flex-shrink-0" />
                                    <div class="flex flex-col min-w-0">
                                        <span class="text-sm text-gray-700 truncate">{{ attachment.filename
                                            }}</span>
                                        <span class="text-xs text-gray-500">{{ formatFileSize(attachment.filesize)
                                            }}</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1">
                                    <button v-if="isImageFile(attachment.filetype)" @click="openPreview(attachment)"
                                        class="flex-shrink-0 p-1 hover:bg-blue-100 rounded-sm transition-colors group"
                                        title="Preview">
                                        <Eye :size="14" class="text-gray-400 group-hover:text-blue-600" />
                                    </button>
                                    <button @click="downloadAttachment(attachment)"
                                        class="flex-shrink-0 p-1 hover:bg-green-100 rounded-sm transition-colors group"
                                        title="Download">
                                        <Download :size="14" class="text-gray-400 group-hover:text-green-600" />
                                    </button>
                                    <button @click="deleteAttachment(attachment.id)"
                                        class="flex-shrink-0 p-1 hover:bg-red-100 rounded-sm transition-colors group"
                                        title="Delete">
                                        <X :size="14" class="text-gray-400 group-hover:text-red-600" />
                                    </button>
                                </div>
                            </div>
                            <div v-if="isUploading" class="flex flex-col gap-2">
                                <div class="flex items-center gap-2">
                                    <div class="flex-1 h-2 bg-gray-200 rounded-sm overflow-hidden">
                                        <div class="h-full bg-blue-500 transition-all duration-300"
                                            :style="{ width: uploadProgress + '%' }"></div>
                                    </div>
                                    <span class="text-xs font-medium text-gray-600">{{ Math.round(uploadProgress)
                                        }}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-start gap-4 px-2">
                    <div class="flex w-full flex-col items-start gap-2">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Add to Card</p>

                        <DropdownMenuRoot>
                            <DropdownMenuTrigger
                                class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 flex items-center gap-2 transition-colors">
                                <UserPlus :size="14" />
                                Members
                            </DropdownMenuTrigger>

                            <DropdownMenuPortal>
                                <DropdownMenuContent side="bottom" :side-offset="5" align="start"
                                    class="w-64 bg-white border border-gray-200 rounded-md shadow-xl z-[100] max-h-64 overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                                    <DropdownMenuLabel class="p-2 border-b border-gray-100">
                                        <p class="text-xs font-semibold text-gray-500 text-center">Members</p>
                                    </DropdownMenuLabel>
                                    <div v-if="availableMembers.length === 0"
                                        class="px-3 py-4 text-sm text-gray-500 text-center">
                                        All team members added
                                    </div>
                                    <DropdownMenuItem v-for="user in availableMembers" :key="user.id"
                                        @click="addMember(user)"
                                        class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer outline-none">
                                        <AvatarRoot
                                            class="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gray-700 align-middle select-none flex-shrink-0">
                                            <AvatarFallback
                                                class="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                                                {{ getInitials(user.name) }}
                                            </AvatarFallback>
                                        </AvatarRoot>
                                        <span class="text-gray-700">{{ user.name }}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenuPortal>
                        </DropdownMenuRoot>

                        <DropdownMenuRoot>
                            <DropdownMenuTrigger
                                class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 flex items-center gap-2 transition-colors">
                                <Tag :size="14" />
                                Labels
                            </DropdownMenuTrigger>

                            <DropdownMenuPortal>
                                <DropdownMenuContent side="bottom" :side-offset="5" align="start"
                                    class="w-72 bg-white border border-gray-200 rounded-md shadow-xl z-[100] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
                                    <DropdownMenuLabel class="p-2 border-b border-gray-100">
                                        <p class="text-xs font-semibold text-gray-500 text-center">Labels</p>
                                    </DropdownMenuLabel>
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
                                            <DropdownMenuItem @click="toggleLabel(label)"
                                                class="flex-1 h-8 px-2 rounded-sm text-left text-sm font-medium text-white hover:opacity-90 transition-opacity flex items-center justify-between relative overflow-hidden cursor-pointer outline-none"
                                                :style="{ backgroundColor: label.color }">
                                                <span class="truncate">{{ label.name }}</span>
                                                <Check v-if="isLabelAssigned(label.id)" :size="16" class="text-white"
                                                    :stroke-width="3" />
                                            </DropdownMenuItem>
                                            <button
                                                class="p-1.5 text-gray-400 hover:bg-gray-100 rounded-sm hover:text-gray-600 transition-colors">
                                                <Pencil :size="14" />
                                            </button>
                                        </div>
                                    </div>
                                    <div class="p-2 border-t border-gray-100 bg-gray-50 rounded-b-md">
                                        <button
                                            class="w-full py-1 text-sm text-gray-600 hover:text-gray-800 hover:underline text-left px-1">
                                            Create new label
                                        </button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenuPortal>
                        </DropdownMenuRoot>

                        <div class="flex flex-col gap-2 w-full">
                            <button @click="editingDueDate = !editingDueDate"
                                class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 flex items-center justify-between transition-colors">
                                <div class="flex items-center gap-2">
                                    <Calendar :size="14" />
                                    Due Date
                                </div>
                                <span v-if="cardData?.dueDate" class="text-xs text-gray-500">
                                    {{ new Date(cardData.dueDate).toLocaleDateString() }}
                                </span>
                            </button>

                            <div v-if="editingDueDate" class="flex flex-col gap-2 p-2 bg-gray-50 rounded-sm">
                                <input type="date"
                                    :value="cardData?.dueDate ? new Date(cardData.dueDate).toISOString().split('T')[0] : ''"
                                    @change="(e) => updateDueDate((e.target as HTMLInputElement).value)"
                                    class="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                <div class="flex gap-2">
                                    <button @click="updateDueDate(null)"
                                        class="flex-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-sm transition-colors">
                                        Clear
                                    </button>
                                    <button @click="editingDueDate = false"
                                        class="flex-1 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-sm transition-colors">
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col gap-2 w-full">
                            <button @click="() => fileInput?.click()"
                                class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 flex items-center justify-between transition-colors">
                                <div class="flex items-center gap-2">
                                    <Paperclip :size="14" />
                                    Attachments
                                </div>
                                <span v-if="attachments.length > 0" class="text-xs text-gray-500">
                                    {{ attachments.length }}
                                </span>
                            </button>
                            <input ref="fileInput" type="file" @change="handleFileUpload" class="hidden" />
                        </div>
                    </div>
                    <div class="flex w-full flex-col gap-2 mt-4">
                        <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Actions</p>
                        <button
                            class="w-full rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors">
                            <Trash2 :size="14" />
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

    <!-- Attachment Preview Modal -->
    <DialogPortal v-if="showPreview && previewAttachment">
        <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-50 bg-gray-900/90"
            @click="closePreview" />
        <DialogContent
            class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] z-[100] max-w-[90vw] max-h-[90vh] translate-x-[-50%] translate-y-[-50%] rounded-sm bg-white p-4 shadow-xl focus:outline-none flex flex-col">
            <div class="flex items-center justify-between mb-4">
                <div class="flex flex-col">
                    <h3 class="text-lg font-semibold text-gray-900">{{ previewAttachment.filename }}</h3>
                    <span class="text-sm text-gray-500">{{ formatFileSize(previewAttachment.filesize) }}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button @click="downloadAttachment(previewAttachment)"
                        class="p-2 rounded-sm hover:bg-gray-100 transition-colors" title="Download">
                        <Download :size="20" class="text-gray-600" />
                    </button>
                    <button @click="closePreview" class="p-2 rounded-sm hover:bg-gray-100 transition-colors"
                        title="Close">
                        <X :size="20" class="text-gray-600" />
                    </button>
                </div>
            </div>
            <div class="flex items-center justify-center flex-1 overflow-hidden">
                <img v-if="isImageFile(previewAttachment.filetype)" :src="previewAttachment.url"
                    :alt="previewAttachment.filename" class="max-w-full max-h-full object-contain rounded-sm" />
            </div>
        </DialogContent>
    </DialogPortal>
</template>

<style scoped></style>
