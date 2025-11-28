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
  const completedCount = todos.value.filter((t) => t.isCompleted).length;
  return (completedCount / todos.value.length) * 100;
});

const availableMembers = computed(() =>
  projectTeamMembers.value.filter(
    (teamMember) =>
      !members.value.some((member) => member.id === teamMember.id),
  ),
);

const buildCardUpdateData = (
  overrides: Partial<CreateCardData> = {},
): Partial<CreateCardData> => {
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

const updateCardInStore = (userId: string, action: "add" | "remove") => {
  const cardInStore = kanbanStore.cards.find(
    (c) => c.id === props.cardData?.id,
  );
  if (!cardInStore) return;

  if (action === "add") {
    if (!cardInStore.members) cardInStore.members = [];
    const user = projectTeamMembers.value.find((u) => u.id === userId);
    if (user && !cardInStore.members.some((m) => m.id === userId)) {
      cardInStore.members.push(user);
    }
  } else {
    if (cardInStore.members) {
      cardInStore.members = cardInStore.members.filter((m) => m.id !== userId);
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
      const [
        fetchedTodos,
        fetchedAttachments,
        fetchedLabels,
        fetchedAllLabels,
        cardMembers,
        teamMembers,
      ] = await Promise.all([
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

      const memberIds = cardMembers.map((cm) => cm.userId);
      members.value = teamMembers.filter((user) => memberIds.includes(user.id));
    } catch (error) {
      console.error("Error fetching card data:", error);
    }
  },
  { deep: true },
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

  const cardUpdateData = buildCardUpdateData({
    description: editableDescription.value || undefined,
  });

  try {
    await kanbanStore.updateCard(props.cardData.id, cardUpdateData);
    emit("update:card", {
      ...props.cardData,
      description: editableDescription.value,
    });
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
      todos.value.length,
    );

    todos.value.push({ ...createdTodo, title, isCompleted: false });
    newTodoTitle.value = "";
    openInputTask.value = false;
    emit("update:card", props.cardData);
  } catch (error) {
    console.error("Error adding task:", error);
  }
};

const handleTodoUpdate = async (updatedTodo: {
  id: string;
  title: string;
  isCompleted: boolean;
}) => {
  const index = todos.value.findIndex((t) => t.id === updatedTodo.id);
  if (index === -1) return;

  const existingTodo = todos.value[index];
  try {
    todos.value[index] = {
      ...existingTodo,
      title: updatedTodo.title,
      isCompleted: updatedTodo.isCompleted,
    } as CardTodo;
    await kanbanStore.updateCardTodo(updatedTodo.id, {
      isCompleted: updatedTodo.isCompleted,
    });
    emit("update:card", props.cardData);
  } catch (error) {
    console.error("Failed to update todo:", error);
  }
};

const handleDeleteTodo = async (id: string) => {
  try {
    await kanbanStore.deleteCardTodo(id);
    todos.value = todos.value.filter((t) => t.id !== id);
    emit("update:card", props.cardData);
  } catch (error) {
    console.error("Failed to delete todo:", error);
  }
};

const addMember = async (user: SafeUser) => {
  if (!props.cardData) return;

  try {
    await kanbanStore.addCardMember(props.cardData.id, user.id);
    updateCardInStore(user.id, "add");
    members.value.push(user);
    emit("update:card", { ...props.cardData, members: members.value });
  } catch (error) {
    console.error("Failed to add member:", error);
  }
};

const removeMember = async (userId: string) => {
  if (!props.cardData) return;

  try {
    await kanbanStore.removeCardMember(props.cardData.id, userId);
    updateCardInStore(userId, "remove");
    members.value = members.value.filter((m) => m.id !== userId);
    emit("update:card", { ...props.cardData, members: members.value });
  } catch (error) {
    console.error("Failed to remove member:", error);
  }
};

const toggleLabel = async (label: Label) => {
  if (!props.cardData) return;

  try {
    const isAssigned = labels.value.some((l) => l.id === label.id);

    if (isAssigned) {
      await kanbanStore.removeCardLabel(props.cardData.id, label.id);
      labels.value = labels.value.filter((l) => l.id !== label.id);
    } else {
      await kanbanStore.addCardLabel(props.cardData.id, label.id);
      labels.value.push(label);
    }

    emit("update:card", { ...props.cardData, labels: labels.value });
  } catch (error) {
    console.error("Failed to toggle label:", error);
  }
};

const updateDueDate = async (newDate: string | null) => {
  if (!props.cardData) return;

  const dateValue = newDate ? new Date(newDate) : null;
  const cardUpdateData = buildCardUpdateData({
    dueDate: dateValue as any,
  });

  try {
    await kanbanStore.updateCard(props.cardData.id, cardUpdateData);
    if (props.cardData) {
      props.cardData.dueDate = dateValue;
    }
    editingDueDate.value = false;
    emit("update:card", props.cardData);
  } catch (error) {
    console.error("Failed to update due date:", error);
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
  formData.append("file", file);

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
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
      xhr.onerror = () => reject(new Error("Upload failed"));
    });

    // Get auth token
    const token = localStorage.getItem("token");
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

    xhr.open("POST", `${apiUrl}/api/cards/${props.cardData.id}/attachments`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);

    const newAttachment = await uploadPromise;
    attachments.value.push(newAttachment);
    emit("update:card", props.cardData);

    if (fileInput.value) {
      fileInput.value.value = "";
    }
  } catch (error) {
    console.error("Failed to upload attachment:", error);
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

const deleteAttachment = async (attachmentId: string) => {
  if (!props.cardData) return;

  try {
    await kanbanStore.deleteCardAttachment(props.cardData.id, attachmentId);
    attachments.value = attachments.value.filter((a) => a.id !== attachmentId);
    emit("update:card", props.cardData);
  } catch (error) {
    console.error("Failed to delete attachment:", error);
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

const isLabelAssigned = (labelId: string) =>
  labels.value.some((l) => l.id === labelId);

const isImageFile = (filetype: string | null | undefined): boolean => {
  if (!filetype) return false;
  return filetype.startsWith("image/");
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
  window.open(attachment.url, "_blank");
};
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-gray-700/80"
    />
    <DialogContent
      class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] z-[100] w-[45dvw] translate-x-[-50%] translate-y-[-50%] rounded-sm bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none"
    >
      <DialogTitle
        class="m-0 mb-4 flex flex-row items-center gap-3 text-[17px] font-semibold text-black"
      >
        <LayoutList />
        <input
          type="text"
          name="title-input"
          id="title-input"
          class="w-[90%] bg-transparent px-2 py-0.5 text-xl font-bold focus:border-b focus:bg-white focus:outline-gray-400/50"
          v-model="editableTitle"
          tabindex="-1"
          @blur="updateTitle"
        />
      </DialogTitle>
      <div class="grid grid-cols-[70%_30%] gap-4">
        <div
          class="flex w-full flex-col text-sm leading-normal text-black"
          :class="members.length > 0 || labels.length > 0 ? 'gap-6' : ''"
        >
          <div class="flex flex-wrap gap-6 pl-10">
            <div class="flex flex-col gap-1.5" v-show="members.length > 0">
              <p class="text-xs font-semibold text-gray-500 uppercase">
                Members
              </p>
              <div class="flex flex-row flex-wrap items-center gap-1">
                <div
                  v-for="member in members"
                  :key="member.id"
                  class="group relative"
                >
                  <AvatarRoot
                    class="inline-flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gray-700 align-middle select-none hover:opacity-90"
                  >
                    <AvatarFallback
                      class="flex h-full w-full items-center justify-center text-xs font-semibold text-white"
                      :title="member.name"
                    >
                      {{ getInitials(member.name) }}
                    </AvatarFallback>
                  </AvatarRoot>
                  <button
                    @click="removeMember(member.id)"
                    class="absolute -top-1 -right-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                    :title="`Remove ${member.name}`"
                  >
                    <X :size="8" />
                  </button>
                </div>
                <DropdownMenuRoot>
                  <DropdownMenuTrigger
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300"
                  >
                    <Plus :size="16" />
                  </DropdownMenuTrigger>

                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      side="bottom"
                      :side-offset="5"
                      align="start"
                      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-[100] max-h-64 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl"
                    >
                      <DropdownMenuLabel class="border-b border-gray-100 p-2">
                        <p
                          class="text-center text-xs font-semibold text-gray-500"
                        >
                          Members
                        </p>
                      </DropdownMenuLabel>
                      <div
                        v-if="availableMembers.length === 0"
                        class="px-3 py-4 text-center text-sm text-gray-500"
                      >
                        All team members added
                      </div>
                      <DropdownMenuItem
                        v-for="user in availableMembers"
                        :key="user.id"
                        @click="addMember(user)"
                        class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-gray-50"
                      >
                        <AvatarRoot
                          class="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-700 align-middle select-none"
                        >
                          <AvatarFallback
                            class="flex h-full w-full items-center justify-center text-xs font-semibold text-white"
                          >
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

            <div class="flex flex-col gap-1.5" v-show="labels.length > 0">
              <p class="text-xs font-semibold text-gray-500 uppercase">
                Labels
              </p>
              <div class="flex flex-row flex-wrap items-center gap-1">
                <div
                  v-for="label in labels"
                  :key="label.id"
                  class="flex h-8 min-w-[60px] cursor-pointer items-center justify-center rounded-sm px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  :style="{ backgroundColor: label.color }"
                >
                  {{ label.name }}
                </div>
                <DropdownMenuRoot>
                  <DropdownMenuTrigger
                    class="flex h-8 w-8 items-center justify-center rounded-sm bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300"
                  >
                    <Plus :size="16" />
                  </DropdownMenuTrigger>

                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      side="bottom"
                      :side-offset="5"
                      align="start"
                      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-[100] flex w-72 flex-col rounded-md border border-gray-200 bg-white shadow-xl"
                    >
                      <DropdownMenuLabel class="border-b border-gray-100 p-2">
                        <p
                          class="text-center text-xs font-semibold text-gray-500"
                        >
                          Labels
                        </p>
                      </DropdownMenuLabel>
                      <div class="p-2">
                        <input
                          type="text"
                          placeholder="Search labels..."
                          class="w-full rounded-sm border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div
                        class="flex max-h-64 flex-col gap-1 overflow-y-auto p-2"
                      >
                        <p class="mb-1 text-xs font-semibold text-gray-500">
                          Labels
                        </p>
                        <div
                          v-if="allLabels.length === 0"
                          class="px-2 py-2 text-center text-sm text-gray-500"
                        >
                          No labels available
                        </div>
                        <div
                          v-for="label in allLabels"
                          :key="label.id"
                          class="group flex items-center gap-2"
                        >
                          <DropdownMenuItem
                            @click="toggleLabel(label)"
                            class="relative flex h-8 flex-1 cursor-pointer items-center justify-between overflow-hidden rounded-sm px-2 text-left text-sm font-medium text-white transition-opacity outline-none hover:opacity-90"
                            :style="{ backgroundColor: label.color }"
                          >
                            <span class="truncate">{{ label.name }}</span>
                            <Check
                              v-if="isLabelAssigned(label.id)"
                              :size="16"
                              class="text-white"
                              :stroke-width="3"
                            />
                          </DropdownMenuItem>
                          <button
                            class="rounded-sm p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Pencil :size="14" />
                          </button>
                        </div>
                      </div>
                      <div
                        class="rounded-b-md border-t border-gray-100 bg-gray-50 p-2"
                      >
                        <button
                          class="w-full px-1 py-1 text-left text-sm text-gray-600 hover:text-gray-800 hover:underline"
                        >
                          Create new label
                        </button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenuRoot>
              </div>
            </div>

            <div class="flex flex-col gap-1.5" v-if="props.cardData?.dueDate">
              <p class="text-xs font-semibold text-gray-500 uppercase">
                Due Date
              </p>
              <div
                class="flex h-8 items-center gap-2 rounded-sm bg-gray-200 px-3 text-sm text-gray-700"
              >
                <span>{{
                  new Date(props.cardData.dueDate).toLocaleDateString()
                }}</span>
                <span
                  class="rounded-xs bg-yellow-300 px-1.5 py-0.5 text-[10px] font-bold text-yellow-800 uppercase"
                  v-if="new Date(props.cardData.dueDate) < new Date()"
                  >Overdue</span
                >
              </div>
            </div>
          </div>

          <div class="flex w-full flex-col gap-2">
            <div class="flex flex-row items-center gap-3">
              <TextInitial />
              <p class="text-lg font-medium">Description</p>
            </div>
            <DialogDescription class="flex w-full flex-col items-start pl-10">
              <textarea
                name=" desc-input"
                id="desc-input"
                v-model="editableDescription"
                class="min-h-[100px] w-full resize-y rounded-sm border-none bg-gray-100 p-3 transition-all focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                @focus="isDescriptionFocused = true"
                placeholder="Add a more detailed description..."
                tabindex="-1"
              />
              <div
                v-show="isDescriptionFocused"
                class="mt-2 flex items-center gap-2"
              >
                <button
                  type="button"
                  @click="
                    () => {
                      saveData();
                      isDescriptionFocused = false;
                    }
                  "
                  class="rounded-sm bg-blue-600 px-4 py-1.5 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  @click="isDescriptionFocused = false"
                  class="rounded-sm px-4 py-1.5 text-gray-600 transition-colors hover:bg-gray-200"
                >
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
              <div class="mb-2 flex items-center gap-2">
                <span class="text-xs font-semibold text-gray-500"
                  >{{ Math.round(progressValue) }}%</span
                >
                <ProgressRoot
                  :model-value="progressValue"
                  class="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                >
                  <ProgressIndicator
                    class="indicator ease-[cubic-bezier(0.65, 0, 0.35, 1)] relative block h-full w-full overflow-hidden rounded-full bg-green-500 transition-transform duration-[450ms]"
                    :style="`transform: translateX(-${100 - progressValue}%)`"
                  />
                </ProgressRoot>
              </div>
            </div>
            <div class="flex w-full flex-col gap-1 pl-10">
              <div class="flex w-full flex-col gap-2">
                <KanbanTodo
                  v-for="todo in todos"
                  :key="todo.id"
                  :todo="{
                    id: todo.id,
                    title: todo.title,
                    isCompleted: todo.isCompleted,
                  }"
                  @update:todo="handleTodoUpdate"
                  @delete:todo="handleDeleteTodo"
                />
              </div>
              <div
                v-show="openInputTask"
                class="mt-2 flex w-full flex-col gap-2"
              >
                <input
                  type="text"
                  name="todo-input"
                  id="todo-input"
                  v-model="newTodoTitle"
                  class="w-full rounded-sm border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Add an item"
                  @keyup.enter="addTask"
                />
                <div class="flex items-center gap-2">
                  <button
                    @click="addTask"
                    class="rounded-sm bg-blue-600 px-4 py-1.5 font-medium text-white hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    @click="openInputTask = false"
                    class="rounded-sm px-4 py-1.5 text-gray-600 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <button
                v-if="!openInputTask"
                class="mt-2 flex w-fit flex-row items-center gap-2 rounded-sm bg-gray-100 px-3 py-1.5 font-medium text-gray-700 transition-all duration-100 ease-in hover:bg-gray-200"
                @click="openInputTask = true"
              >
                <Plus class="h-4 w-4" /> Add an item
              </button>
            </div>
          </div>

          <div
            v-if="attachments.length > 0 || isUploading"
            class="flex flex-col gap-2"
          >
            <div class="flex items-center gap-2">
              <Paperclip />
              <p class="text-lg font-medium">Attachments</p>
            </div>
            <div class="flex flex-col gap-1 pl-8">
              <div
                v-for="attachment in attachments"
                :key="attachment.id"
                class="flex items-center justify-between rounded-sm bg-gray-50 p-2 transition-colors hover:bg-gray-100"
              >
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <Paperclip :size="14" class="flex-shrink-0 text-gray-400" />
                  <div class="flex min-w-0 flex-col">
                    <span class="truncate text-sm text-gray-700">{{
                      attachment.filename
                    }}</span>
                    <span class="text-xs text-gray-500">{{
                      formatFileSize(attachment.filesize)
                    }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    v-if="isImageFile(attachment.filetype)"
                    @click="openPreview(attachment)"
                    class="group flex-shrink-0 rounded-sm p-1 transition-colors hover:bg-blue-100"
                    title="Preview"
                  >
                    <Eye
                      :size="14"
                      class="text-gray-400 group-hover:text-blue-600"
                    />
                  </button>
                  <button
                    @click="downloadAttachment(attachment)"
                    class="group flex-shrink-0 rounded-sm p-1 transition-colors hover:bg-green-100"
                    title="Download"
                  >
                    <Download
                      :size="14"
                      class="text-gray-400 group-hover:text-green-600"
                    />
                  </button>
                  <button
                    @click="deleteAttachment(attachment.id)"
                    class="group flex-shrink-0 rounded-sm p-1 transition-colors hover:bg-red-100"
                    title="Delete"
                  >
                    <X
                      :size="14"
                      class="text-gray-400 group-hover:text-red-600"
                    />
                  </button>
                </div>
              </div>
              <div v-if="isUploading" class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <div
                    class="h-2 flex-1 overflow-hidden rounded-sm bg-gray-200"
                  >
                    <div
                      class="h-full bg-blue-500 transition-all duration-300"
                      :style="{ width: uploadProgress + '%' }"
                    ></div>
                  </div>
                  <span class="text-xs font-medium text-gray-600"
                    >{{ Math.round(uploadProgress) }}%</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-col items-start gap-4 px-2">
          <div class="flex w-full flex-col items-start gap-2">
            <p class="mb-1 text-xs font-semibold text-gray-500 uppercase">
              Add to Card
            </p>

            <DropdownMenuRoot>
              <DropdownMenuTrigger
                class="flex w-full items-center gap-2 rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <UserPlus :size="14" />
                Members
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <DropdownMenuContent
                  side="bottom"
                  :side-offset="5"
                  align="start"
                  class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-[100] max-h-64 w-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl"
                >
                  <DropdownMenuLabel class="border-b border-gray-100 p-2">
                    <p class="text-center text-xs font-semibold text-gray-500">
                      Members
                    </p>
                  </DropdownMenuLabel>
                  <div
                    v-if="availableMembers.length === 0"
                    class="px-3 py-4 text-center text-sm text-gray-500"
                  >
                    All team members added
                  </div>
                  <DropdownMenuItem
                    v-for="user in availableMembers"
                    :key="user.id"
                    @click="addMember(user)"
                    class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-gray-50"
                  >
                    <AvatarRoot
                      class="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-700 align-middle select-none"
                    >
                      <AvatarFallback
                        class="flex h-full w-full items-center justify-center text-xs font-semibold text-white"
                      >
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
                class="flex w-full items-center gap-2 rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <Tag :size="14" />
                Labels
              </DropdownMenuTrigger>

              <DropdownMenuPortal>
                <DropdownMenuContent
                  side="bottom"
                  :side-offset="5"
                  align="start"
                  class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-[100] flex w-72 flex-col rounded-md border border-gray-200 bg-white shadow-xl"
                >
                  <DropdownMenuLabel class="border-b border-gray-100 p-2">
                    <p class="text-center text-xs font-semibold text-gray-500">
                      Labels
                    </p>
                  </DropdownMenuLabel>
                  <div class="p-2">
                    <input
                      type="text"
                      placeholder="Search labels..."
                      class="w-full rounded-sm border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div class="flex max-h-64 flex-col gap-1 overflow-y-auto p-2">
                    <p class="mb-1 text-xs font-semibold text-gray-500">
                      Labels
                    </p>
                    <div
                      v-if="allLabels.length === 0"
                      class="px-2 py-2 text-center text-sm text-gray-500"
                    >
                      No labels available
                    </div>
                    <div
                      v-for="label in allLabels"
                      :key="label.id"
                      class="group flex items-center gap-2"
                    >
                      <DropdownMenuItem
                        @click="toggleLabel(label)"
                        class="relative flex h-8 flex-1 cursor-pointer items-center justify-between overflow-hidden rounded-sm px-2 text-left text-sm font-medium text-white transition-opacity outline-none hover:opacity-90"
                        :style="{ backgroundColor: label.color }"
                      >
                        <span class="truncate">{{ label.name }}</span>
                        <Check
                          v-if="isLabelAssigned(label.id)"
                          :size="16"
                          class="text-white"
                          :stroke-width="3"
                        />
                      </DropdownMenuItem>
                      <button
                        class="rounded-sm p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Pencil :size="14" />
                      </button>
                    </div>
                  </div>
                  <div
                    class="rounded-b-md border-t border-gray-100 bg-gray-50 p-2"
                  >
                    <button
                      class="w-full px-1 py-1 text-left text-sm text-gray-600 hover:text-gray-800 hover:underline"
                    >
                      Create new label
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenuRoot>

            <div class="flex w-full flex-col gap-2">
              <button
                @click="editingDueDate = !editingDueDate"
                class="flex w-full items-center justify-between rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <div class="flex items-center gap-2">
                  <Calendar :size="14" />
                  Due Date
                </div>
                <span v-if="cardData?.dueDate" class="text-xs text-gray-500">
                  {{ new Date(cardData.dueDate).toLocaleDateString() }}
                </span>
              </button>

              <div
                v-if="editingDueDate"
                class="flex flex-col gap-2 rounded-sm bg-gray-50 p-2"
              >
                <input
                  type="date"
                  :value="
                    cardData?.dueDate
                      ? new Date(cardData.dueDate).toISOString().split('T')[0]
                      : ''
                  "
                  @change="
                    (e) => updateDueDate((e.target as HTMLInputElement).value)
                  "
                  class="w-full rounded-sm border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <div class="flex gap-2">
                  <button
                    @click="updateDueDate(null)"
                    class="flex-1 rounded-sm bg-gray-200 px-2 py-1 text-xs transition-colors hover:bg-gray-300"
                  >
                    Clear
                  </button>
                  <button
                    @click="editingDueDate = false"
                    class="flex-1 rounded-sm bg-blue-500 px-2 py-1 text-xs text-white transition-colors hover:bg-blue-600"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>

            <div class="flex w-full flex-col gap-2">
              <button
                @click="() => fileInput?.click()"
                class="flex w-full items-center justify-between rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <div class="flex items-center gap-2">
                  <Paperclip :size="14" />
                  Attachments
                </div>
                <span
                  v-if="attachments.length > 0"
                  class="text-xs text-gray-500"
                >
                  {{ attachments.length }}
                </span>
              </button>
              <input
                ref="fileInput"
                type="file"
                @change="handleFileUpload"
                class="hidden"
              />
            </div>
          </div>
          <div class="mt-4 flex w-full flex-col gap-2">
            <p class="mb-1 text-xs font-semibold text-gray-500 uppercase">
              Actions
            </p>
            <button
              class="flex w-full items-center gap-2 rounded-sm bg-gray-100 px-3 py-1.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 :size="14" />
              Delete
            </button>
          </div>
        </div>
      </div>
      <DialogClose
        class="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full text-gray-500 hover:cursor-pointer hover:bg-gray-100 hover:text-black focus:outline-none"
        aria-label="Close"
      >
        <X class="h-5 w-5" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>

  <!-- Attachment Preview Modal -->
  <DialogPortal v-if="showPreview && previewAttachment">
    <DialogOverlay
      class="data-[state=open]:animate-overlayShow fixed inset-0 z-50 bg-gray-900/90"
      @click="closePreview"
    />
    <DialogContent
      class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] z-[100] flex max-h-[90vh] max-w-[90vw] translate-x-[-50%] translate-y-[-50%] flex-col rounded-sm bg-white p-4 shadow-xl focus:outline-none"
    >
      <div class="mb-4 flex items-center justify-between">
        <div class="flex flex-col">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ previewAttachment.filename }}
          </h3>
          <span class="text-sm text-gray-500">{{
            formatFileSize(previewAttachment.filesize)
          }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="downloadAttachment(previewAttachment)"
            class="rounded-sm p-2 transition-colors hover:bg-gray-100"
            title="Download"
          >
            <Download :size="20" class="text-gray-600" />
          </button>
          <button
            @click="closePreview"
            class="rounded-sm p-2 transition-colors hover:bg-gray-100"
            title="Close"
          >
            <X :size="20" class="text-gray-600" />
          </button>
        </div>
      </div>
      <div class="flex flex-1 items-center justify-center overflow-hidden">
        <img
          v-if="isImageFile(previewAttachment.filetype)"
          :src="previewAttachment.url"
          :alt="previewAttachment.filename"
          class="max-h-full max-w-full rounded-sm object-contain"
        />
      </div>
    </DialogContent>
  </DialogPortal>
</template>

<style scoped></style>
