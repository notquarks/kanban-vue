<script setup lang="ts">
import type { KanbanCard } from '@/stores/kanban';
import { LayoutList, TextInitial, X } from 'lucide-vue-next';
import {
    DialogClose,
    DialogContent,
    DialogOverlay,
    DialogPortal,
    DialogTitle
} from 'reka-ui';
import { ref, watch } from 'vue';

const props = defineProps<{
    cardData: KanbanCard | undefined
}>();

const emit = defineEmits(['update:description']);

const editableDescription = ref(props.cardData?.description || '');

watch(() => props.cardData, (newCardData) => {
    editableDescription.value = newCardData?.description || '';
}, { deep: true });

const saveDescription = () => {
    emit('update:description', editableDescription.value);
};

</script>

<template>
    <DialogPortal>
        <DialogOverlay class="bg-gray-700/80 data-[state=open]:animate-overlayShow fixed inset-0 z-30" />
        <DialogContent
            class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-[100]">
            <DialogTitle class="text-black m-0 text-[17px] font-semibold flex flex-row gap-2">
                <LayoutList />
                {{ cardData?.title }}
            </DialogTitle>
            <div class="flex flex-col w-full mt-4 text-black mt-2 mb-5 text-sm leading-normal gap-4">
                <div class="flex flex-col gap-1">
                    <p>Members</p>
                    <div class="flex flex-row">
                        <AvatarRoot
                            class="bg-black inline-flex h-8 w-8 select-none items-center justify-center overflow-hidden rounded-full align-middle">
                            <AvatarFallback
                                class="text-white dark:text-stone-300 leading-1 flex h-full w-full items-center justify-center bg-white dark:bg-stone-800 text-sm font-medium"
                                :delay-ms="600">
                                CT
                            </AvatarFallback>
                        </AvatarRoot>
                    </div>
                </div>
                <div class="flex flex-col gap-1 w-full">
                    <div class="flex flex-row gap-2">
                        <TextInitial />
                        Description
                    </div>
                    <textarea name="desc-input" id="desc-input" v-model="editableDescription"
                        class="border border-gray-600/50 h-24 p-2 rounded-sm" placeholder="Add Description"></textarea>
                </div>
            </div>
            <fieldset class="mb-[15px] flex items-center gap-5">
                <label class="text-black w-[90px] text-right text-sm" for="name"> Name </label>
                <input id="name" class="basic-input w-full" defaultValue="Pedro Duarte">
            </fieldset>
            <fieldset class="mb-[15px] flex items-center gap-5">
                <label class="text-black w-[90px] text-right text-sm" for="username"> Username </label>
                <input id="username" class="basic-input w-full" defaultValue="@peduarte">
            </fieldset>
            <div class="mt-[25px] flex justify-end">
                <DialogClose as-child>
                    <button @click="saveDescription"
                        class="bg-black text-white text-sm hover:bg-gray-800/80 focus:shadow-black inline-flex h-[35px] items-center justify-center rounded-lg px-[15px] font-semibold leading-none focus:shadow-[0_0_0_2px] focus:outline-none">
                        Save changes
                    </button>
                </DialogClose>
            </div>
            <DialogClose
                class="text-black hover:cursor-pointer hover:text-white hover:bg-gray-800/70 focus:shadow-black absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                aria-label="Close">
                <X class="m-1" />
            </DialogClose>
        </DialogContent>
    </DialogPortal>
</template>


<style scoped></style>
