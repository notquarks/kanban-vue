<script setup lang="ts">
import KanbanList from "@/components/kanban/Kanban-List.vue";
import {
  useKanbanStore,
  type CreateBoardData,
  type KanbanBoard,
  type KanbanColumn,
  type Label,
} from "@/stores/kanban";
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
  TabsTrigger,
} from "reka-ui";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import draggable from "vuedraggable";
import { Edit2, Trash2, UserPlus2, Users } from "lucide-vue-next";
import { useTeamsStore } from "@/stores/teams";
import { useProjectsStore } from "@/stores/projects";
import { useAuthStore } from "@/stores/auth";
import type { SafeUser } from "@/types";

const route = useRoute("/project/[id]");

definePage({
  meta: {
    requiresAuth: true,
    title: "Project",
  },
});

const projectId = route.params.id as string;
const kanbanStore = useKanbanStore();
const teamsStore = useTeamsStore();
const projectsStore = useProjectsStore();
const authStore = useAuthStore();
const boards = ref<KanbanBoard[]>([]);
const createBoardName = ref("");
const isTemplate = ref(false);
const boardToDelete = ref<string | null>(null);
const activeTab = ref("add-tab");
const inputColumn = ref<boolean>(false);
const columnInput = ref<string>("");
const isDraggingColumn = ref<boolean>(false);
const labels = ref<Label[]>([]);
const newLabelName = ref("");
const newLabelColor = ref("#3B82F6");
const editingLabelId = ref<string | null>(null);
const editingLabelName = ref("");
const editingLabelColor = ref("");
const allUsers = ref<SafeUser[]>([]);
const teamMembers = ref<SafeUser[]>([]);
const currentProject = ref<any>(null);

const getColumnsForBoard = (boardId: string) => {
  if (!kanbanStore.columns || !Array.isArray(kanbanStore.columns)) {
    return [];
  }
  return kanbanStore.columns
    .filter((col) => col.boardId === boardId)
    .sort((a, b) => a.order - b.order);
};

const boardColumnsMap = computed(() => {
  const map = new Map<string, KanbanColumn[]>();
  boards.value.forEach((board) => {
    map.set(board.id, getColumnsForBoard(board.id));
  });
  return map;
});

const onColumnDragStart = () => {
  isDraggingColumn.value = true;
  document.body.classList.add("dragging-column");
};

const onColumnDragEnd = () => {
  isDraggingColumn.value = false;
  document.body.classList.remove("dragging-column");
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
  return boards.value;
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
      const defaultColumns = ["To Do", "In Progress", "Done"];
      for (const [i, name] of defaultColumns.entries()) {
        await kanbanStore.createColumn({
          boardId: createdBoard.id,
          name: name,
          order: i,
        });
      }
      await getColumns(createdBoard.id);
    }

    await getBoards(projectId);
    createBoardName.value = "";
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
      activeTab.value = "add-tab";
    }

    const firstBoardId = boards.value[0]?.id;
    if (firstBoardId) {
      await getColumns(firstBoardId);
    }
  } catch (error) {
    console.error("Failed to delete board:", error);
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
        order: currentColumns.length,
      });
      await getColumns(boardId);
    } catch (err) {
      console.error("Failed to create column:", err);
    }
    columnInput.value = "";
    inputColumn.value = false;
  }
};

const cancelColumn = () => {
  columnInput.value = "";
  inputColumn.value = false;
};

onMounted(async () => {
  await getBoards(projectId);

  if (boards.value.length > 0) {
    activeTab.value = "tab0";
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

  if (card?.status === "done" && targetColumn?.name.toLowerCase() === "todo") {
    return;
  }
};

const loadLabels = async () => {
  try {
    labels.value = await kanbanStore.fetchLabels();
  } catch (error) {
    console.error("Failed to load labels:", error);
  }
};

const createLabel = async () => {
  if (!newLabelName.value.trim()) return;

  try {
    await kanbanStore.createLabel(newLabelName.value, newLabelColor.value);
    await loadLabels();
    newLabelName.value = "";
    newLabelColor.value = "#3B82F6";
  } catch (error) {
    console.error("Failed to create label:", error);
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
      editingLabelColor.value,
    );
    await loadLabels();
    cancelEditLabel();
  } catch (error) {
    console.error("Failed to update label:", error);
  }
};

const cancelEditLabel = () => {
  editingLabelId.value = null;
  editingLabelName.value = "";
  editingLabelColor.value = "";
};

const deleteLabel = async (labelId: string) => {
  try {
    await kanbanStore.deleteLabel(labelId);
    await loadLabels();
  } catch (error) {
    console.error("Failed to delete label:", error);
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
      teamMembers.value =
        await projectsStore.fetchProjectTeamMembers(projectId);
    }
  } catch (error) {
    console.error("Failed to load project:", error);
  }
};

const loadAllUsers = async () => {
  if (!authStore.token) {
    return;
  }
  try {
    allUsers.value = await teamsStore.fetchAllUsers();
  } catch (error) {
    console.error("Failed to load users:", error);
  }
};

const availableUsers = computed(() => {
  return allUsers.value.filter(
    (user) => !teamMembers.value.some((member) => member.id === user.id),
  );
});

const addUserToProjectTeam = async (user: SafeUser) => {
  if (!currentProject.value?.teamId) {
    console.error("Project does not have a team");
    return;
  }

  try {
    await teamsStore.addUserToTeam(currentProject.value.teamId, user.id);
    teamMembers.value.push(user);
  } catch (error) {
    console.error("Failed to add user to team:", error);
  }
};

const getUserInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const removeUserFromProjectTeam = async (userId: string) => {
  if (!currentProject.value?.teamId) {
    console.error("Project does not have a team");
    return;
  }

  try {
    await teamsStore.removeUserFromTeam(currentProject.value.teamId, userId);
    teamMembers.value = teamMembers.value.filter(
      (member) => member.id !== userId,
    );
  } catch (error) {
    console.error("Failed to remove user from team:", error);
  }
};
</script>

<template>
  <div class="flex min-h-0 w-full flex-1 flex-col">
    <TabsRoot
      class="flex min-h-0 w-full flex-1 flex-col justify-center"
      v-model="activeTab"
    >
      <TabsList
        class="relative flex shrink-0 gap-1 border-b border-gray-200 bg-white px-4 pt-3"
      >
        <TabsTrigger
          v-for="(board, index) in boards"
          :key="`board-${board.id}`"
          :value="`tab${index}`"
          class="group flex flex-row items-center justify-between gap-2 rounded-t-md border-x border-t border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-600 transition-all hover:cursor-pointer hover:bg-gray-50 hover:text-gray-700 data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
        >
          <span>{{ board.name }}</span>
          <AlertDialogRoot>
            <AlertDialogTrigger as-child>
              <button
                @click.stop="boardToDelete = board.id"
                class="rounded-sm p-1 text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-700 focus:opacity-100 focus:ring-2 focus:outline-none"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogPortal>
              <AlertDialogOverlay
                class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
              />
              <AlertDialogContent
                class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg"
              >
                <AlertDialogTitle
                  class="m-0 text-[17px] font-semibold text-black"
                >
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription
                  class="mt-4 mb-5 text-[15px] leading-normal text-gray-600"
                >
                  This action cannot be undone. This will permanently delete the
                  board "{{ board.name }}" and remove all its data from the
                  servers.
                </AlertDialogDescription>
                <div class="flex justify-end gap-[25px]">
                  <AlertDialogCancel
                    class="inline-flex h-[35px] items-center justify-center rounded-[4px] border bg-white px-[15px] leading-none font-semibold text-black outline-none hover:bg-gray-200"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    class="inline-flex h-[35px] items-center justify-center rounded-[4px] bg-red-600 px-[15px] leading-none font-semibold text-white outline-none hover:bg-red-700 focus:shadow-[0_0_0_2px] focus:shadow-red-700"
                    @click="deleteBoard(board.id)"
                  >
                    Yes, delete board
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialogPortal>
          </AlertDialogRoot>
        </TabsTrigger>

        <DialogRoot>
          <DialogTrigger as-child>
            <TabsTrigger
              value="add-tab"
              class="flex items-center justify-center rounded-t-md border-x border-t border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-600 transition-all hover:cursor-pointer hover:bg-gray-50 hover:text-gray-700 data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:font-medium data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              <Plus :stroke-width="2.5" class="h-4 w-4" />
            </TabsTrigger>
          </DialogTrigger>
          <DialogPortal>
            <DialogOverlay
              class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
            />
            <DialogContent
              class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg"
            >
              <DialogTitle
                class="text-lg leading-none font-semibold tracking-tight"
              >
                New Board
              </DialogTitle>
              <DialogDescription class="text-sm text-gray-600">
                Create a new board for your project.
              </DialogDescription>
              <fieldset class="my-2 mt-3 flex w-full flex-col space-y-4">
                <div class="flex w-full flex-col space-y-1">
                  <label for="boardname" class="text-sm font-medium">
                    Name
                  </label>
                  <input
                    type="text"
                    v-model="createBoardName"
                    id="boardname"
                    placeholder="Board Name"
                    required
                    class="basic-input"
                  />
                </div>
                <div class="flex flex-row items-center gap-3">
                  <label for="basic-template" class="text-sm font-medium">
                    Use Basic Template
                  </label>
                  <SwitchRoot
                    id="basic-template"
                    v-model="isTemplate"
                    class="relative flex h-[20px] w-[42px] cursor-default rounded-full bg-black/50 shadow-sm focus-within:outline focus-within:outline-black data-[state=checked]:bg-black"
                  >
                    <SwitchThumb
                      class="my-auto block h-[20px] w-[20px] translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-100 will-change-transform data-[state=checked]:translate-x-[20px]"
                    />
                  </SwitchRoot>
                </div>
              </fieldset>
              <div class="mt-2 flex justify-end space-x-2">
                <DialogClose as-child>
                  <button
                    class="inline-flex h-[35px] items-center justify-center rounded-[4px] border bg-white px-[15px] leading-none font-semibold text-black hover:cursor-pointer hover:bg-gray-200 focus:shadow-[0_0_0_2px] focus:shadow-gray-300 focus:outline-none"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <DialogClose as-child>
                  <button
                    @click="createBoard"
                    class="inline-flex h-[35px] items-center justify-center rounded-[4px] bg-black px-[15px] leading-none font-semibold text-white hover:cursor-pointer hover:bg-gray-700 focus:shadow-[0_0_0_2px] focus:shadow-gray-300 focus:outline-none"
                  >
                    Create Board
                  </button>
                </DialogClose>
              </div>
            </DialogContent>
          </DialogPortal>
        </DialogRoot>
      </TabsList>

      <TabsContent
        v-for="(board, index) in boards"
        :key="`content-${board.id}`"
        class="flex min-h-0 w-full flex-1 flex-col overflow-hidden border-t border-gray-200 bg-white outline-none"
        :value="`tab${index}`"
        force-mount
        :hidden="activeTab !== `tab${index}`"
      >
        <div
          class="flex h-full min-h-0 flex-col space-y-4 overflow-hidden px-4 pt-5"
        >
          <div class="flex w-full flex-row items-center space-x-4">
            <DialogRoot
              @update:open="
                (open) => {
                  if (open) loadLabels();
                }
              "
            >
              <DialogTrigger
                class="cursor-pointer rounded-sm bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Labels
              </DialogTrigger>
              <DialogPortal>
                <DialogOverlay
                  class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-gray-700/80"
                />
                <DialogContent
                  class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] z-[100] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none"
                >
                  <DialogTitle class="mb-2 text-lg font-semibold">
                    Labels Management
                  </DialogTitle>
                  <DialogDescription class="flex flex-col gap-4 text-gray-600">
                    <p class="text-sm">
                      Create and manage labels for your project cards
                    </p>
                    <div class="border-t pt-4">
                      <h3 class="mb-3 text-sm font-medium text-black">
                        Create New Label
                      </h3>
                      <div class="flex flex-col gap-2">
                        <div class="flex gap-2">
                          <input
                            type="color"
                            v-model="newLabelColor"
                            class="h-10 w-12 cursor-pointer rounded border border-gray-300"
                            title="Choose label color"
                          />
                          <input
                            type="text"
                            v-model="newLabelName"
                            placeholder="Label name"
                            @keyup.enter="createLabel"
                            class="basic-input w-full"
                            tabindex="-1"
                          />
                          <button
                            @click="createLabel"
                            class="rounded bg-black px-4 py-2 text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                            :disabled="!newLabelName.trim()"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="border-t pt-4">
                      <h3 class="mb-3 text-sm font-medium text-black">
                        Existing Labels
                      </h3>
                      <div
                        v-if="labels.length === 0"
                        class="py-8 text-center text-gray-400"
                      >
                        <p>No labels yet. Create one above!</p>
                      </div>
                      <div
                        v-else
                        class="flex max-h-[300px] flex-col gap-2 overflow-y-auto"
                      >
                        <div
                          v-for="label in labels"
                          :key="label.id"
                          class="group flex items-center gap-2 rounded px-1 py-2 transition-colors hover:bg-gray-50"
                        >
                          <template v-if="editingLabelId === label.id">
                            <input
                              type="color"
                              v-model="editingLabelColor"
                              class="h-8 w-10 cursor-pointer rounded border border-gray-300"
                            />
                            <input
                              type="text"
                              v-model="editingLabelName"
                              @keyup.enter="saveLabel"
                              @keyup.esc="cancelEditLabel"
                              class="flex-1 rounded border border-gray-300 px-2 py-1 text-black focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              tabindex="-1"
                            />
                            <button
                              @click="saveLabel"
                              class="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-700"
                            >
                              Save
                            </button>
                            <button
                              @click="cancelEditLabel"
                              class="rounded bg-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </template>
                          <template v-else>
                            <div
                              class="h-8 w-8 flex-shrink-0 rounded"
                              :style="{ backgroundColor: label.color }"
                            ></div>
                            <span class="flex-1 font-medium text-black">
                              {{ label.name }}</span
                            >
                            <div
                              class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <button
                                @click="startEditLabel(label)"
                                class="rounded p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
                                title="Edit label"
                              >
                                <Edit2 :size="16" />
                              </button>
                              <button
                                @click="deleteLabel(label.id)"
                                class="rounded p-1.5 text-red-600 transition-colors hover:bg-red-50"
                                title="Delete label"
                              >
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
                    aria-label="Close"
                  >
                    <X class="m-1" />
                  </DialogClose>
                </DialogContent>
              </DialogPortal>
            </DialogRoot>
            <DialogRoot
              @update:open="
                (open) => {
                  if (open) {
                    loadProject();
                    loadAllUsers();
                  }
                }
              "
            >
              <DialogTrigger
                class="cursor-pointer rounded-sm bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Team Members
              </DialogTrigger>
              <DialogPortal>
                <DialogOverlay
                  class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-gray-700/80"
                />
                <DialogContent
                  class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] z-[100] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none"
                >
                  <DialogTitle class="mb-2 text-lg font-semibold">
                    Team Members Management
                  </DialogTitle>
                  <DialogDescription class="flex flex-col gap-4 text-gray-600">
                    <p class="text-sm">Manage team members for this project</p>
                    <div class="border-t pt-4" v-if="currentProject?.teamId">
                      <h3 class="mb-3 text-sm font-medium text-black">
                        Add Team Member
                      </h3>
                      <div
                        class="flex max-h-[200px] flex-col gap-2 overflow-y-auto"
                      >
                        <div
                          v-if="availableUsers.length === 0"
                          class="py-4 text-center text-gray-400"
                        >
                          <p>All users are already in the team</p>
                        </div>
                        <div
                          v-for="user in availableUsers"
                          :key="user.id"
                          class="flex items-center gap-3 rounded px-3 py-2 text-left transition-colors hover:bg-gray-50"
                        >
                          <div
                            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold text-white"
                          >
                            {{ getUserInitials(user.name) }}
                          </div>
                          <div class="min-w-0 flex-1">
                            <p class="truncate font-medium text-black">
                              {{ user.name }}
                            </p>
                            <p class="truncate text-xs text-gray-500">
                              {{ user.email }}
                            </p>
                          </div>
                          <button
                            type="button"
                            @click="addUserToProjectTeam(user)"
                            class="group rounded-sm p-2 transition-colors duration-100 hover:bg-gray-300"
                          >
                            <UserPlus2
                              :size="18"
                              class="flex-shrink-0 text-gray-400 group-hover:text-gray-600"
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="border-t pt-4">
                      <h3 class="mb-3 text-sm font-medium text-black">
                        Current Team Members
                      </h3>
                      <div
                        v-if="!currentProject?.teamId"
                        class="py-8 text-center text-gray-400"
                      >
                        <Users :size="48" class="mx-auto mb-2 opacity-50" />
                        <p>This project doesn't have a team assigned</p>
                      </div>
                      <div
                        v-else-if="teamMembers.length === 0"
                        class="py-8 text-center text-gray-400"
                      >
                        <p>No team members yet</p>
                      </div>
                      <div
                        v-else
                        class="flex max-h-[250px] flex-col gap-2 overflow-y-auto"
                      >
                        <div
                          v-for="member in teamMembers"
                          :key="member.id"
                          class="group relative flex items-center gap-3 rounded px-3 py-2 transition-colors hover:bg-gray-50"
                        >
                          <div
                            class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold text-white"
                          >
                            {{ getUserInitials(member.name) }}
                          </div>
                          <div class="min-w-0 flex-1">
                            <p class="truncate font-medium text-black">
                              {{ member.name }}
                            </p>
                            <p class="truncate text-xs text-gray-500">
                              {{ member.email }}
                            </p>
                          </div>
                          <button
                            @click="removeUserFromProjectTeam(member.id)"
                            class="flex-shrink-0 rounded p-2 text-red-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-100"
                            title="Remove from team"
                          >
                            <Trash2 :size="16" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </DialogDescription>
                  <DialogClose
                    class="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full text-black hover:cursor-pointer hover:bg-gray-200 focus:shadow-[0_0_0_2px] focus:shadow-black focus:outline-none"
                    aria-label="Close"
                  >
                    <X class="m-1" />
                  </DialogClose>
                </DialogContent>
              </DialogPortal>
            </DialogRoot>
          </div>
          <div class="min-h-0 flex-1 overflow-x-auto overflow-y-hidden py-4">
            <div class="flex h-full flex-row space-x-4">
              <draggable
                :list="boardColumnsMap.get(board.id) || []"
                @start="onColumnDragStart"
                @end="onColumnDragEnd"
                @change="(e: any) => onColumnChange(e, board.id)"
                item-key="id"
                :animation="200"
                handle=".column-drag-handle"
                ghost-class="column-ghost"
                chosen-class="column-chosen"
                drag-class="column-drag"
                class="flex h-full flex-row space-x-4"
                group="columns"
              >
                <template #item="{ element: cardColumn }">
                  <div :key="cardColumn.id" class="column-wrapper h-full">
                    <KanbanList
                      @card-moved="handleCardMoved"
                      :listId="cardColumn.id"
                      :boardId="board.id"
                      :projectId="projectId"
                      :isLoading="false"
                    />
                  </div>
                </template>
              </draggable>

              <div
                class="h-fit w-2xs flex-shrink-0 rounded-sm border border-gray-400 transition-all duration-100 ease-in"
              >
                <button
                  @click="insertColumn"
                  v-if="!inputColumn"
                  class="flex h-full w-full rounded-sm bg-gray-200 px-3 py-2 text-sm transition-all duration-100 ease-in hover:cursor-pointer hover:bg-gray-300/90 hover:underline"
                >
                  Add Column
                </button>
                <div
                  class="flex flex-col space-y-2 bg-gray-200/60 px-2 py-3 shadow-sm"
                  v-else
                >
                  <div class="flex flex-col">
                    <input
                      type="text"
                      name="card-title"
                      id="card-title"
                      class="basic-input h-8 bg-white"
                      placeholder="Enter column name"
                      @keyup.enter="addColumn(board.id, columnInput)"
                      v-model="columnInput"
                      required
                    />
                  </div>
                  <div class="flex flex-row space-x-2">
                    <button
                      type="button"
                      @click="addColumn(board.id, columnInput)"
                      class="rounded-sm bg-black px-2 py-0.5 text-sm text-white hover:cursor-pointer hover:bg-gray-600/90"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      @click="cancelColumn"
                      class="rounded-sm border border-gray-700 px-2 py-0.5 text-sm hover:cursor-pointer hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent
        value="add-tab"
        class="h-full w-full grow rounded-b-md bg-white p-5 outline-none"
        force-mount
        :hidden="activeTab !== 'add-tab'"
      >
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
