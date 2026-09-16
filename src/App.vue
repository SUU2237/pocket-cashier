<script setup lang="ts">
import { RouterView } from 'vue-router'
import StorageWarningBanner from './components/StorageWarningBanner.vue';

</script>

<template>
  <RouterView />
  <StorageWarningBanner/>
</template>

<style scoped></style>
