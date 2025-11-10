<script lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <div>
    <h1>This is kanban board</h1>
    <!-- <h1>Kanban Board {{ route.params?.id }}</h1> -->
  </div>
</template>
