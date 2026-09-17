<script setup lang="ts">
import { RouterView } from 'vue-router'
import StorageWarningBanner from './components/StorageWarningBanner.vue';

</script>

<template>
  <div class="min-h-screen bg-[#f4f4f5] text-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
    <RouterView />
    <StorageWarningBanner/>
  </div>
  
</template>

<style scoped></style>
