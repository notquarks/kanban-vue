<script setup lang="ts">
import KanbanList from "@/components/kanban/Kanban-List.vue";
import { type KanbanBoard, useKanbanStore, type KanbanColumn, type CreateBoardData } from "@/stores/kanban";
import { Plus, X } from "lucide-vue-next";
import {
  TabsRoot,
  TabsContent,
  TabsList,
  TabsTrigger,
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogContent,
  DialogDescription,
  DialogClose,
  SwitchThumb,
  SwitchRoot,
  AlertDialogRoot,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction
} from "radix-vue";
import { computed, onMounted, ref, type Ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

definePage({
  meta: {
    requiresAuth: true,
    title: 'Project'
  }
})

const projectId = route.query.id as string;
const kanbanStore = useKanbanStore();
const boards = ref<KanbanBoard[]>([]);
const cardColumns = ref<KanbanColumn[]>([]);
const createBoardName = ref('');
const isTemplate = ref(false);
const boardToDelete = ref<string | null>(null);
const activeTab = ref('add-tab');
const inputColumn = ref<boolean>(false);
const columnInput = ref<string>('');

async function getBoards(projectId: string) {
  boards.value = await kanbanStore.fetchBoards(projectId);
  return boards.value
}

async function getColumns(boardId: string) {
  cardColumns.value = await kanbanStore.fetchColumns(boardId);
  return cardColumns.value
}

async function createBoard() {
  const newBoard: CreateBoardData = {
    projectId: projectId,
    name: createBoardName.value,
  };

  const createdBoard = await kanbanStore.createBoard(newBoard);
  if (createdBoard) {
    await getBoards(projectId);
    createBoardName.value = '';
    activeTab.value = `tab${boards.value.length - 1}`;
  }
}

async function deleteBoard(boardId: string) {
  try {
    await kanbanStore.deleteBoard(boardId);
    await getBoards(projectId);

    if (boards.value.length > 0) {
      activeTab.value = `tab${boards.value.length}`;
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

const getColumnsForBoard = (boardId: string) => {
  if (!kanbanStore.columns || !Array.isArray(kanbanStore.columns)) {
    return [];
  }
  return kanbanStore.columns.filter(col => col.boardId === boardId);
};


const insertColumn = () => {
  inputColumn.value = true;
};

const addColumn = async (boardId: string, name: string) => {
  if (name.trim()) {
    try {
      await kanbanStore.createColumn({
        boardId: boardId,
        name: name,
        order: (kanbanStore.columns?.length || 0) + 1
      });
      // Fetch columns again to update UI immediately
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

</script>

<template>
  <div class="flex flex-col w-full h-full grow">
    <TabsRoot class="flex flex-col w-full justify-center h-full grow" v-model="activeTab">
      <TabsList class="relative shrink-0 flex border-b pl-4 pt-2 border-gray-500 gap-2">
        <TabsTrigger v-for="(board, index) in boards" :key="`board-${board.id}`" :value="`tab${index}`"
          class="px-1 pl-3 py-1 hover:cursor-pointer bg-gray-500 text-white data-[state=active]:bg-gray-700 data-[state=active]:font-semibold flex flex-row cardColumns-center justify-between gap-2 rounded-t-sm">
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
                  This action cannot be undone. This will permanently delete the board "{{ board.name }}" and remove all
                  its data from the servers.
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
                  <input type="text" v-model="createBoardName" id="boardname" placeholder="Board Name" required
                    class="basic-input" />
                </div>
                <div class="flex flex-row items-center gap-3">
                  <label for="basic-template" class="text-sm font-medium">
                    Use Basic Template
                  </label>
                  <SwitchRoot id="basic-template" v-model:checked="isTemplate"
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
        class="grow h-full bg-white rounded-b-md outline-none w-full flex flex-col" :value="`tab${index}`">
        <div class="flex flex-col space-y-4 p-6 flex-grow overflow-x-scroll">
          <div class="flex flex-row space-x-4 items-center w-full">
            <button class="underline hover:cursor-pointer">Labels</button>
          </div>
          <div class="flex flex-row w-full min-w-dvw space-x-4">
            <KanbanList :v-if="cardColumn" v-for="cardColumn in getColumnsForBoard(board.id)" :key="cardColumn.id"
              :listId="cardColumn.id" :boardId="board.id" :projectId="projectId" :isLoading="false" />
            <div class="border border-gray-400 w-2xs h-fit rounded-sm transition-all duration-100 ease-in">
              <button @click="insertColumn" v-if="!inputColumn"
                class="flex w-full h-full text-sm hover:underline transition-all duration-100 ease-in bg-gray-200 py-2 px-3 rounded-sm hover:bg-gray-300/90 hover:cursor-pointer">
                Add Column
              </button>
              <div class="flex flex-col shadow-sm space-y-2 px-2 py-3 bg-gray-200/60" v-else>
                <div class="flex flex-col">
                  <input type="text" name="card-title" id="card-title" class="basic-input h-8 bg-white"
                    placeholder="Enter card title" @keyup.enter="addColumn(board.id, columnInput)" v-model="columnInput"
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
      </TabsContent>

      <TabsContent value="add-tab" class="grow p-5 bg-white rounded-b-md outline-none w-full h-full">
        <p>Nothing here</p>
      </TabsContent>
    </TabsRoot>
  </div>
</template>