<script setup lang="ts">
import { EllipsisVertical } from "lucide-vue-next";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "radix-vue";
import { defineProps, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { type Project, useProjectsStore } from "@/stores/projects";
import ModalNewProject from "./Modal-Project.vue";
import { useRouter } from "vue-router";

const router = useRouter();
const projectStore = useProjectsStore();
const authStore = useAuthStore();
const toggleState = ref(false);
const errorMessage = ref<string | Error | null>(null);

const isEditModalOpen = ref(false);
const isLoading = ref(false);

const props = defineProps<{
  project: Project;
}>();

async function handleEditProject(data: { name: string; description: string }) {
  isLoading.value = true;

  try {
    await projectStore.updateProject(props.project.id, {
      name: data.name,
      description: data.description,
    });
    isEditModalOpen.value = false;
  } catch (err) {
    errorMessage.value = err instanceof Error ? err : "Something went wrong";
  } finally {
    isLoading.value = false;
  }
}

async function handleDeleteProject(projectId: string) {
  errorMessage.value = null;
  toggleState.value = false;

  try {
    await projectStore.deleteProject(projectId);
  } catch (err) {
    errorMessage.value = err instanceof Error ? err : "Something went wrong";
  }
}

function navigateToProject(projectId: string) {
  router.push({
    path: `/project/${projectId}`,
    query: { id: projectId }
  });
}

</script>

<template>
  <div
    class="flex aspect-square group/card w-auto min-w-64 cursor-pointer flex-col rounded-md border bg-white p-4 shadow-md hover:shadow-lg hover:bg-gray-700 hover:text-gray-100 transition-all ease-linear duration-100"
    @click="navigateToProject(project.id)">
    <div class="mb-3 flex h-4/5 w-full rounded-md bg-gradient-to-br from-blue-500 to-blue-600" />
    <div class="flex flex-row">
      <div class="flex-1">
        <h3 class="truncate font-semibold text-gray-900 group-hover/card:text-gray-50">{{ project.name }}</h3>
        <p class="mt-1 line-clamp-2 text-sm text-gray-600 group-hover/card:text-gray-100">
          {{ project.description || "No description available" }}
        </p>
      </div>
      <DropdownMenuRoot v-model:open="toggleState">
        <DropdownMenuTrigger @click.stop class="rounded-xs p-0.5 hover:cursor-pointer hover:bg-gray-500 ">
          <EllipsisVertical />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            class="data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade min-w-[140px] rounded-sm border bg-white will-change-[opacity,transform] outline-none"
            :avoidCollisions="false" :side-offset="2">
            <DropdownMenuItem value="New Tab"
              class="group data-[disabled]:text-mauve8 relative flex items-center rounded-t-[2px] px-4 py-2 pl-4 text-sm leading-none outline-none select-none hover:cursor-pointer data-[disabled]:pointer-events-none data-[highlighted]:bg-gray-900 data-[highlighted]:text-white"
              @click="isEditModalOpen = true">
              Edit Project
            </DropdownMenuItem>
            <AlertDialogRoot>
              <DropdownMenuItem
                class="group data-[disabled]:text-mauve8 relative flex w-full items-center rounded-b-[2px] px-4 py-2 pl-4 text-sm leading-none outline-none select-none hover:cursor-pointer data-[disabled]:pointer-events-none data-[highlighted]:bg-gray-900 data-[highlighted]:text-white"
                as-child @select.prevent>
                <AlertDialogTrigger> Delete Project </AlertDialogTrigger>
              </DropdownMenuItem>
              <AlertDialogPortal>
                <AlertDialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-gray-800/90" />

                <AlertDialogContent
                  class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] z-[100] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] text-[15px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none">
                  <AlertDialogTitle class="text-xl font-bold">Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription class="text-mauve11 mt-4 mb-5 text-[15px] leading-normal">
                    Once you delete a project, there is no going back. This
                    <span class="font-semibold italic">'{{ project.name }}'</span>
                    project will be deleted permanently.
                  </AlertDialogDescription>
                  <div class="flex justify-end gap-4">
                    <AlertDialogCancel
                      class="rounded-sm bg-black px-5 py-2 text-white hover:cursor-pointer hover:bg-gray-700 focus:ring-2 focus:ring-gray-300 focus:outline-none"
                      @click="toggleState = false">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction @click="handleDeleteProject(project.id)"
                      class="rounded-sm bg-red-700 px-5 py-2 text-white hover:cursor-pointer hover:bg-red-900 focus:ring-2 focus:ring-red-300 focus:outline-none">
                      Delete Project
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialogPortal>
            </AlertDialogRoot>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
  </div>

  <ModalNewProject :open="isEditModalOpen" :is-editing="true" :is-loading="isLoading" :initial-data="project"
    @close="isEditModalOpen = false" @submit="handleEditProject" />
</template>
