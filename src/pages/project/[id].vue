<script setup lang="ts">
import KanbanList from "@/components/kanban/Kanban-List.vue";
import { useKanbanStore, type CreateBoardData, type KanbanBoard, type KanbanColumn, type Label } from "@/stores/kanban";
import { Plus, X } from "lucide-vue-next";
import {
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogOverlay,
    AlertDialogPortal,
    AlertDialogRoot,
    AlertDialogTitle,
    AlertDialogTrigger,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
    SwitchRoot,
    SwitchThumb,
    TabsContent,
    TabsList,
    TabsRoot,
    TabsTrigger
} from "reka-ui";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import draggable from 'vuedraggable';
import { Edit2, Trash2, UserPlus2, Users } from "lucide-vue-next";
import { useTeamsStore } from "@/stores/teams";
import { useProjectsStore } from "@/stores/projects";
import { useAuthStore } from "@/stores/auth";
import type { SafeUser } from "@/types";

const route = useRoute('/project/[id]')

definePage({
    meta: {
        requiresAuth: true,
        title: 'Project'
    }
})

const projectId = route.params.id as string;
const kanbanStore = useKanbanStore();
const teamsStore = useTeamsStore();
const projectsStore = useProjectsStore();
const authStore = useAuthStore();
const boards = ref<KanbanBoard[]>([]);
const createBoardName = ref('');
const isTemplate = ref(false);
const boardToDelete = ref<string | null>(null);
const activeTab = ref('add-tab');
const inputColumn = ref<boolean>(false);
const columnInput = ref<string>('');
const isDraggingColumn = ref<boolean>(false);
const labels = ref<Label[]>([]);
const newLabelName = ref('');
const newLabelColor = ref('#3B82F6');
const editingLabelId = ref<string | null>(null);
const editingLabelName = ref('');
const editingLabelColor = ref('');
const allUsers = ref<SafeUser[]>([]);
const teamMembers = ref<SafeUser[]>([]);
const currentProject = ref<any>(null);

const getColumnsForBoard = (boardId: string) => {
    if (!kanbanStore.columns || !Array.isArray(kanbanStore.columns)) {
        return [];
    }
    return kanbanStore.columns
        .filter(col => col.boardId === boardId)
        .sort((a, b) => a.order - b.order);
};

const boardColumnsMap = computed(() => {
    const map = new Map<string, KanbanColumn[]>();
    boards.value.forEach(board => {
        map.set(board.id, getColumnsForBoard(board.id));
    });
    return map;
});

const onColumnDragStart = () => {
    isDraggingColumn.value = true;
    document.body.classList.add('dragging-column');
};

const onColumnDragEnd = () => {
    isDraggingColumn.value = false;
    document.body.classList.remove('dragging-column');
};

const onColumnChange = async (event: any, boardId: string) => {

    if (event.moved) {
        const column = event.moved.element;
        const newIndex = event.moved.newIndex;
        const oldIndex = event.moved.oldIndex;

        try {
            await kanbanStore.reorderColumn(column.id, boardId, newIndex);
        } catch (error) {
            await getColumns(boardId);
        }
    }
};

async function getBoards(projectId: string) {
    boards.value = await kanbanStore.fetchBoards(projectId);
    return boards.value
}

async function getColumns(boardId: string) {
    await kanbanStore.fetchColumns(boardId);
}

async function createBoard() {
    const newBoard: CreateBoardData = {
        projectId: projectId,
        name: createBoardName.value,
    };

    const createdBoard = await kanbanStore.createBoard(newBoard);
    if (createdBoard) {
        if (isTemplate.value) {
            const defaultColumns = ['To Do', 'In Progress', 'Done'];
            for (const [i, name] of defaultColumns.entries()) {
                await kanbanStore.createColumn({
                    boardId: createdBoard.id,
                    name: name,
                    order: i
                });
            }
            await getColumns(createdBoard.id);
        }

        await getBoards(projectId);
        createBoardName.value = '';
        isTemplate.value = false;
        activeTab.value = `tab${boards.value.length - 1}`;
    }
}

async function deleteBoard(boardId: string) {
    try {
        await kanbanStore.deleteBoard(boardId);
        await getBoards(projectId);

        if (boards.value.length > 0) {
            activeTab.value = `tab${boards.value.length - 1}`;
        } else {
            activeTab.value = 'add-tab';
        }

        const firstBoardId = boards.value[0]?.id;
        if (firstBoardId) {
            await getColumns(firstBoardId);
        }
    } catch (error) {
        console.error('Failed to delete board:', error);
    }
}

const insertColumn = () => {
    inputColumn.value = true;
};

const addColumn = async (boardId: string, name: string) => {
    if (name.trim()) {
        try {
            const currentColumns = getColumnsForBoard(boardId);
            await kanbanStore.createColumn({
                boardId: boardId,
                name: name,
                order: currentColumns.length
            });
            await getColumns(boardId);
        } catch (err) {
            console.error('Failed to create column:', err);
        }
        columnInput.value = '';
        inputColumn.value = false;
    }
};

const cancelColumn = () => {
    columnInput.value = '';
    inputColumn.value = false;
}

onMounted(async () => {
    await getBoards(projectId);

    if (boards.value.length > 0) {
        activeTab.value = 'tab0';
    }

    const firstBoardId = boards.value[0]?.id;
    if (firstBoardId) {
        await getColumns(firstBoardId);
    }
});

const handleCardMoved = async (event: {
    cardId: string;
    fromColumnId: string;
    toColumnId: string;
    newIndex: number;
    oldIndex: number;
}) => {
    const card = kanbanStore.getCardById(event.cardId);
    const targetColumn = kanbanStore.getColumnById(event.toColumnId);

    if (card?.status === 'done' && targetColumn?.name.toLowerCase() === 'todo') {
        return;
    }
};

const loadLabels = async () => {
    try {
        labels.value = await kanbanStore.fetchLabels();
    } catch (error) {
        console.error('Failed to load labels:', error);
    }
};

const createLabel = async () => {
    if (!newLabelName.value.trim()) return;

    try {
        await kanbanStore.createLabel(newLabelName.value, newLabelColor.value);
        await loadLabels();
        newLabelName.value = '';
        newLabelColor.value = '#3B82F6';
    } catch (error) {
        console.error('Failed to create label:', error);
    }
};

const startEditLabel = (label: Label) => {
    editingLabelId.value = label.id;
    editingLabelName.value = label.name;
    editingLabelColor.value = label.color;
};

const saveLabel = async () => {
    if (!editingLabelId.value || !editingLabelName.value.trim()) return;

    try {
        await kanbanStore.updateLabel(
            editingLabelId.value,
            editingLabelName.value,
            editingLabelColor.value
        );
        await loadLabels();
        cancelEditLabel();
    } catch (error) {
        console.error('Failed to update label:', error);
    }
};

const cancelEditLabel = () => {
    editingLabelId.value = null;
    editingLabelName.value = '';
    editingLabelColor.value = '';
};

const deleteLabel = async (labelId: string) => {
    try {
        await kanbanStore.deleteLabel(labelId);
        await loadLabels();
    } catch (error) {
        console.error('Failed to delete label:', error);
    }
};

const loadProject = async () => {
    if (!authStore.token) {
        return;
    }
    try {
        const project = await projectsStore.getProjectById(projectId);
        currentProject.value = project;
        if (project?.teamId) {
            teamMembers.value = await projectsStore.fetchProjectTeamMembers(projectId);
        }
    } catch (error) {
        console.error('Failed to load project:', error);
    }
};

const loadAllUsers = async () => {
    if (!authStore.token) {
        return;
    }
    try {
        allUsers.value = await teamsStore.fetchAllUsers();
    } catch (error) {
        console.error('Failed to load users:', error);
    }
};

const availableUsers = computed(() => {
    return allUsers.value.filter(
        user => !teamMembers.value.some(member => member.id === user.id)
    );
});

const addUserToProjectTeam = async (user: SafeUser) => {
    if (!currentProject.value?.teamId) {
        console.error('Project does not have a team');
        return;
    }

    try {
        await teamsStore.addUserToTeam(currentProject.value.teamId, user.id);
        teamMembers.value.push(user);
    } catch (error) {
        console.error('Failed to add user to team:', error);
    }
};

const getUserInitials = (name: string): string => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
};

const removeUserFromProjectTeam = async (userId: string) => {
    if (!currentProject.value?.teamId) {
        console.error('Project does not have a team');
        return;
    }

    try {
        await teamsStore.removeUserFromTeam(currentProject.value.teamId, userId);
        teamMembers.value = teamMembers.value.filter(member => member.id !== userId);
    } catch (error) {
        console.error('Failed to remove user from team:', error);
    }
};
</script>

<template>
    <div class="flex flex-col w-full min-h-0 flex-1">
        <TabsRoot class="flex flex-col w-full justify-center flex-1 min-h-0" v-model="activeTab">
            <TabsList class="relative shrink-0 flex border-b pl-4 pt-2 border-gray-500 gap-2">
                <TabsTrigger v-for="(board, index) in boards" :key="`board-${board.id}`" :value="`tab${index}`"
                    class="px-1 pl-3 py-1 hover:cursor-pointer bg-gray-500 text-white data-[state=active]:bg-gray-700 data-[state=active]:font-semibold flex flex-row items-center justify-between gap-2 rounded-t-sm">
                    <span>{{ board.name }}</span>
                    <AlertDialogRoot>
                        <AlertDialogTrigger as-child>
                            <button @click.stop="boardToDelete = board.id"
                                class="p-0.5 text-white hover:bg-gray-500/90 hover:cursor-pointer focus:outline-none focus:ring-2 rounded-xs">
                                <X class="h-4 w-4" />
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogPortal>
                            <AlertDialogOverlay
                                class="bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50" />
                            <AlertDialogContent
                                class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-lg">
                                <AlertDialogTitle class="text-black m-0 text-[17px] font-semibold">
                                    Are you absolutely sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription class="text-gray-600 mt-4 mb-5 text-[15px] leading-normal">
                                    This action cannot be undone. This will permanently delete the board "{{ board.name
                                    }}" and remove all its data from the servers.
                                </AlertDialogDescription>
                                <div class="flex justify-end gap-[25px]">
                                    <AlertDialogCancel
                                        class="text-black bg-white border hover:bg-gray-200 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-semibold leading-none outline-none">
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        class="text-white bg-red-600 hover:bg-red-700 focus:shadow-red-700 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-semibold leading-none outline-none focus:shadow-[0_0_0_2px]"
                                        @click="deleteBoard(board.id)">
                                        Yes, delete board
                                    </AlertDialogAction>
                                </div>
                            </AlertDialogContent>
                        </AlertDialogPortal>
                    </AlertDialogRoot>
                </TabsTrigger>

                <DialogRoot>
                    <DialogTrigger as-child>
                        <TabsTrigger value="add-tab"
                            class="data-[state=active]:bg-gray-800 bg-gray-500 px-2 py-1 rounded-t-sm hover:cursor-pointer data-[state=active]:font-bold text-white">
                            <Plus :stroke-width="3" />
                        </TabsTrigger>
                    </DialogTrigger>
                    <DialogPortal>
                        <DialogOverlay
                            class="bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50" />
                        <DialogContent
                            class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
                            <DialogTitle class="text-lg font-semibold leading-none tracking-tight">
                                New Board
                            </DialogTitle>
                            <DialogDescription class="text-sm text-gray-600">
                                Create a new board for your project.
                            </DialogDescription>
                            <fieldset class="flex flex-col w-full space-y-4 mt-3 my-2">
                                <div class="flex flex-col w-full space-y-1">
                                    <label for="boardname" class="text-sm font-medium">
                                        Name
                                    </label>
                                    <input type="text" v-model="createBoardName" id="boardname" placeholder="Board Name"
                                        required class="basic-input" />
                                </div>
                                <div class="flex flex-row items-center gap-3">
                                    <label for="basic-template" class="text-sm font-medium">
                                        Use Basic Template
                                    </label>
                                    <SwitchRoot id="basic-template" v-model="isTemplate"
                                        class="w-[42px] h-[20px] focus-within:outline focus-within:outline-black flex bg-black/50 shadow-sm rounded-full relative data-[state=checked]:bg-black cursor-default">
                                        <SwitchThumb
                                            class="block w-[20px] h-[20px] my-auto bg-white shadow-sm rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[20px]" />
                                    </SwitchRoot>
                                </div>
                            </fieldset>
                            <div class="mt-2 flex justify-end space-x-2">
                                <DialogClose as-child>
                                    <button
                                        class="bg-white text-black border hover:bg-gray-200 focus:shadow-gray-300 hover:cursor-pointer inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-semibold leading-none focus:shadow-[0_0_0_2px] focus:outline-none">
                                        Cancel
                                    </button>
                                </DialogClose>
                                <DialogClose as-child>
                                    <button @click="createBoard"
                                        class="bg-black text-white hover:bg-gray-700 focus:shadow-gray-300 hover:cursor-pointer inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-semibold leading-none focus:shadow-[0_0_0_2px] focus:outline-none">
                                        Create Board
                                    </button>
                                </DialogClose>
                            </div>
                        </DialogContent>
                    </DialogPortal>
                </DialogRoot>
            </TabsList>

            <TabsContent v-for="(board, index) in boards" :key="`content-${board.id}`"
                class="flex-1 bg-white rounded-b-md outline-none w-full flex flex-col min-h-0 overflow-hidden"
                :value="`tab${index}`" force-mount :hidden="activeTab !== `tab${index}`">
                <div class="flex flex-col space-y-4 pt-6 px-4 h-full min-h-0 overflow-hidden">
                    <div class="flex flex-row space-x-4 items-center w-full">
                        <DialogRoot @update:open="(open) => { if (open) loadLabels(); }">
                            <DialogTrigger class="underline hover:cursor-pointer">
                                Labels
                            </DialogTrigger>
                            <DialogPortal>
                                <DialogOverlay
                                    class="bg-gray-700/80 data-[state=open]:animate-overlayShow fixed inset-0 z-30" />
                                <DialogContent
                                    class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-[100]">
                                    <DialogTitle class="text-lg font-semibold mb-2">
                                        Labels Management
                                    </DialogTitle>
                                    <DialogDescription class="flex flex-col gap-4 text-gray-600">
                                        <p class="text-sm">Create and manage labels for your project cards</p>
                                        <div class="border-t pt-4">
                                            <h3 class="text-sm font-medium text-black mb-3">Create New Label</h3>
                                            <div class="flex flex-col gap-2">
                                                <div class="flex gap-2">
                                                    <input type="color" v-model="newLabelColor"
                                                        class="h-10 w-12 rounded border border-gray-300 cursor-pointer"
                                                        title="Choose label color" />
                                                    <input type="text" v-model="newLabelName" placeholder="Label name"
                                                        @keyup.enter="createLabel" class="basic-input w-full"
                                                        tabindex="-1" />
                                                    <button @click="createLabel"
                                                        class="px-4 py-2 bg-black text-white rounded hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                                        :disabled="!newLabelName.trim()">
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="border-t pt-4">
                                            <h3 class="text-sm font-medium text-black mb-3">Existing Labels</h3>
                                            <div v-if="labels.length === 0" class="text-center py-8 text-gray-400">
                                                <p>No labels yet. Create one above!</p>
                                            </div>
                                            <div v-else class="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                                                <div v-for="label in labels" :key="label.id"
                                                    class="flex items-center gap-2 px-1 py-2 rounded hover:bg-gray-50 transition-colors group">
                                                    <template v-if="editingLabelId === label.id">
                                                        <input type="color" v-model="editingLabelColor"
                                                            class="h-8 w-10 rounded border border-gray-300 cursor-pointer" />
                                                        <input type="text" v-model="editingLabelName"
                                                            @keyup.enter="saveLabel" @keyup.esc="cancelEditLabel"
                                                            class="flex-1 px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                                                            tabindex="-1" />
                                                        <button @click="saveLabel"
                                                            class="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-700">
                                                            Save
                                                        </button>
                                                        <button @click="cancelEditLabel"
                                                            class="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400">
                                                            Cancel
                                                        </button>
                                                    </template>
                                                    <template v-else>
                                                        <div class="w-8 h-8 rounded flex-shrink-0"
                                                            :style="{ backgroundColor: label.color }"></div>
                                                        <span class="flex-1 text-black font-medium">
                                                            {{ label.name }}</span>
                                                        <div
                                                            class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                            <button @click="startEditLabel(label)"
                                                                class="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="Edit label">
                                                                <Edit2 :size="16" />
                                                            </button>
                                                            <button @click="deleteLabel(label.id)"
                                                                class="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Delete label">
                                                                <Trash2 :size="16" />
                                                            </button>
                                                        </div>
                                                    </template>
                                                </div>
                                            </div>
                                        </div>
                                    </DialogDescription>
                                    <DialogClose
                                        class="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full text-black hover:cursor-pointer hover:bg-gray-200 focus:shadow-[0_0_0_2px] focus:shadow-black focus:outline-none"
                                        aria-label="Close">
                                        <X class="m-1" />
                                    </DialogClose>
                                </DialogContent>
                            </DialogPortal>
                        </DialogRoot>
                        <DialogRoot @update:open="(open) => { if (open) { loadProject(); loadAllUsers(); } }">
                            <DialogTrigger class="underline hover:cursor-pointer">
                                Team Members
                            </DialogTrigger>
                            <DialogPortal>
                                <DialogOverlay
                                    class="bg-gray-700/80 data-[state=open]:animate-overlayShow fixed inset-0 z-30" />
                                <DialogContent
                                    class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-[100]">
                                    <DialogTitle class="text-lg font-semibold mb-2">
                                        Team Members Management
                                    </DialogTitle>
                                    <DialogDescription class="flex flex-col gap-4 text-gray-600">
                                        <p class="text-sm">Manage team members for this project</p>
                                        <div class="border-t pt-4" v-if="currentProject?.teamId">
                                            <h3 class="text-sm font-medium text-black mb-3">Add Team Member</h3>
                                            <div class="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                                                <div v-if="availableUsers.length === 0"
                                                    class="text-center py-4 text-gray-400">
                                                    <p>All users are already in the team</p>
                                                </div>
                                                <div v-for="user in availableUsers" :key="user.id"
                                                    class="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 transition-colors text-left">
                                                    <div
                                                        class="h-8 w-8 rounded-full flex items-center justify-center text-white bg-gray-700 text-xs font-semibold flex-shrink-0">
                                                        {{ getUserInitials(user.name) }}
                                                    </div>
                                                    <div class="flex-1 min-w-0">
                                                        <p class="font-medium text-black truncate">{{ user.name }}</p>
                                                        <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
                                                    </div>
                                                    <button type="button" @click="addUserToProjectTeam(user)"
                                                        class="group hover:bg-gray-300 transition-colors duration-100 p-2 rounded-sm">
                                                        <UserPlus2 :size="18"
                                                            class="text-gray-400 flex-shrink-0 group-hover:text-gray-600" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="border-t pt-4">
                                            <h3 class="text-sm font-medium text-black mb-3">Current Team Members</h3>
                                            <div v-if="!currentProject?.teamId" class="text-center py-8 text-gray-400">
                                                <Users :size="48" class="mx-auto mb-2 opacity-50" />
                                                <p>This project doesn't have a team assigned</p>
                                            </div>
                                            <div v-else-if="teamMembers.length === 0"
                                                class="text-center py-8 text-gray-400">
                                                <p>No team members yet</p>
                                            </div>
                                            <div v-else class="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                                                <div v-for="member in teamMembers" :key="member.id"
                                                    class="group flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 transition-colors relative">
                                                    <div
                                                        class="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                                        {{ getUserInitials(member.name) }}
                                                    </div>
                                                    <div class="flex-1 min-w-0">
                                                        <p class="font-medium text-black truncate">{{ member.name }}</p>
                                                        <p class="text-xs text-gray-500 truncate">{{ member.email }}</p>
                                                    </div>
                                                    <button @click="removeUserFromProjectTeam(member.id)"
                                                        class="opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-opacity p-2 text-red-600 rounded flex-shrink-0"
                                                        title="Remove from team">
                                                        <Trash2 :size="16" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </DialogDescription>
                                    <DialogClose
                                        class="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full text-black hover:cursor-pointer hover:bg-gray-200 focus:shadow-[0_0_0_2px] focus:shadow-black focus:outline-none"
                                        aria-label="Close">
                                        <X class="m-1" />
                                    </DialogClose>
                                </DialogContent>
                            </DialogPortal>
                        </DialogRoot>
                    </div>
                    <div class="flex-1 overflow-x-auto overflow-y-hidden py-4 min-h-0">
                        <div class="flex flex-row space-x-4 h-full">
                            <draggable :list="boardColumnsMap.get(board.id) || []" @start="onColumnDragStart"
                                @end="onColumnDragEnd" @change="(e: any) => onColumnChange(e, board.id)" item-key="id"
                                :animation="200" handle=".column-drag-handle" ghost-class="column-ghost"
                                chosen-class="column-chosen" drag-class="column-drag"
                                class="flex flex-row space-x-4 h-full" group="columns">
                                <template #item="{ element: cardColumn }">
                                    <div :key="cardColumn.id" class="column-wrapper h-full">
                                        <KanbanList @card-moved="handleCardMoved" :listId="cardColumn.id"
                                            :boardId="board.id" :projectId="projectId" :isLoading="false" />
                                    </div>
                                </template>
                            </draggable>

                            <div
                                class="border border-gray-400 w-2xs h-fit rounded-sm transition-all duration-100 ease-in flex-shrink-0">
                                <button @click="insertColumn" v-if="!inputColumn"
                                    class="flex w-full h-full text-sm hover:underline transition-all duration-100 ease-in bg-gray-200 py-2 px-3 rounded-sm hover:bg-gray-300/90 hover:cursor-pointer">
                                    Add Column
                                </button>
                                <div class="flex flex-col shadow-sm space-y-2 px-2 py-3 bg-gray-200/60" v-else>
                                    <div class="flex flex-col">
                                        <input type="text" name="card-title" id="card-title"
                                            class="basic-input h-8 bg-white" placeholder="Enter column name"
                                            @keyup.enter="addColumn(board.id, columnInput)" v-model="columnInput"
                                            required />
                                    </div>
                                    <div class="flex flex-row space-x-2">
                                        <button type="button" @click="addColumn(board.id, columnInput)"
                                            class="bg-black text-white rounded-sm hover:bg-gray-600/90 px-2 text-sm py-0.5 hover:cursor-pointer">
                                            Add
                                        </button>
                                        <button type="button" @click="cancelColumn"
                                            class="border-gray-700 border rounded-sm px-2 hover:underline text-sm py-0.5 hover:cursor-pointer">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="add-tab" class="grow p-5 bg-white rounded-b-md outline-none w-full h-full" force-mount
                :hidden="activeTab !== 'add-tab'">
                <p>Nothing here</p>
            </TabsContent>
        </TabsRoot>
    </div>
</template>

<style scoped>
.dragging-column {
    cursor: grabbing !important;
}

.column-wrapper {
    flex-shrink: 0;
}

.column-ghost {
    opacity: 0.4;
    background: #f0f0f0;
}

.column-chosen {
    opacity: 0.9;
}

.column-drag {
    opacity: 0.5;
    transform: rotate(2deg);
}
</style>
