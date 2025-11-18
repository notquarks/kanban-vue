<script setup lang="ts">
import { useKanbanStore } from "@/stores/kanban";
import { Check, Pencil, SquareCheckBig, Trash, X } from "lucide-vue-next";
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";
import { ref, watch } from "vue";

interface Props {
    todo?: {
        id: string;
        title: string;
        isCompleted: boolean;
    };
}

const kanbanStore = useKanbanStore();

const props = withDefaults(defineProps<Props>(), {
    todo: undefined
});

const emit = defineEmits<{
    'update:modelValue': [value: boolean | 'indeterminate' | null];
    'update:todo': [todo: { id: string; title: string; isCompleted: boolean }];
    'delete:todo': [id: string];
}>();


const isChecked = ref<boolean>(props.todo?.isCompleted ?? false);
const showEditTodo = ref(false);
const editInput = ref(props.todo?.title ?? '');

watch(() => props.todo, (newTodo) => {
    if (newTodo) {
        isChecked.value = newTodo.isCompleted;
    }
}, { deep: true, immediate: true });

watch(isChecked, async (newValue) => {
    emit('update:modelValue', newValue);

    if (props.todo) {
        const updatedTodo = {
            id: props.todo.id,
            title: props.todo.title,
            isCompleted: newValue
        };
        emit('update:todo', updatedTodo);

        try {
            await kanbanStore.updateCardTodo(props.todo.id, { isCompleted: newValue });
        } catch (error) {
            console.error('Failed to update todo on server:', error);
        }
    }
});

async function deleteTodo(id: string | undefined) {
    if (id) {
        emit('delete:todo', id);
        showEditTodo.value = false;
        editInput.value = '';
    }
}



</script>

<template>
    <div class="flex w-full flex-row">
        <label class="flex flex-row items-center [&>.checkbox]:hover:bg-neutral-100 justify-between w-full"
            v-if="!showEditTodo">
            <div class="flex flex-row gap-3">
                <CheckboxRoot v-model="isChecked"
                    class="flex h-4 w-4 appearance-none items-center justify-center rounded-sm border bg-white shadow-sm outline-none focus-within:shadow-[0_0_0_2px_black] hover:bg-stone-50">
                    <CheckboxIndicator class="flex h-full w-full items-center justify-center rounded bg-gray-800">
                        <Check color="#ffffff" />
                    </CheckboxIndicator>
                </CheckboxRoot>
                <span class="text-sm text-stone-700 select-none" :class="isChecked ? 'line-through' : ''">
                    {{ todo?.title || 'No text' }}
                </span>
            </div>
            <button class="hover:bg-gray-200 transition-all ease-in rounded-sm" @click="showEditTodo = true">
                <Pencil class="p-1" color="#515357FF" />
            </button>
        </label>
        <div class="flex flex-row w-full gap-1" v-else>
            <input type="text" name="edit-todo" id="edit-todo" v-model="editInput" class="basic-input w-full">
            <button class="rounded-sm hover:bg-gray-200">
                <Check class="p-1" />
            </button>
            <button class="rounded-sm hover:bg-gray-200" @click="showEditTodo = false">
                <X class="p-1" />
            </button>
            <button class="rounded-sm hover:bg-red-200" @click="deleteTodo(props.todo?.id)">
                <Trash class="p-1" color="#C23333FF" />
            </button>

        </div>
    </div>
</template>

<style></style>
