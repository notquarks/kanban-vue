<script setup lang="ts">
interface Card {
  title: string;
  desc: string;
}

const card: Card = {
  title: "Project Title",
  desc: "This is a brief description of the project.",
};
</script>

<template>
  <div class="flex aspect-video w-fit min-w-1/5 flex-col border p-2 shadow-lg">
    <div class="flex h-4/5 w-full bg-blue-500"></div>
    <div>
      <p>{{ card.title }}</p>
      <span>{{ card.desc }}</span>
    </div>
  </div>
</template>
