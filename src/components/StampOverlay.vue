<script setup lang="ts">
defineProps<{
  show: boolean
  title?: string
  subtitle?: string
  variant?: 'danger' | 'success'
}>()
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-60 bg-black/50 flex items-center justify-center backdrop-blur-xs select-none pointer-events-none"
  >
    <!-- 印章本體 -->
    <div
      class="px-6 py-2 border-4 bg-white/95 transition-transform"
      :class="[
        variant === 'success'
          ? 'border-emerald-600 shadow-[6px_6px_0px_#059669]'
          : 'border-red-600 shadow-[6px_6px_0px_#dc2626]',
        'animate-[stamp-slam_0.28s_cubic-bezier(0.25,1,0.5,1)_forwards]'
      ]"
    >
      <div
        class="border-2 border-dashed px-4 py-1 text-center font-mono"
        :class="variant === 'success' ? 'border-emerald-600' : 'border-red-600'"
      >
        <div
          class="text-xs font-black tracking-widest uppercase"
          :class="variant === 'success' ? 'text-emerald-500' : 'text-red-500'"
        >
          {{ subtitle || (variant === 'success' ? 'ORDER COMPLETE' : 'TRANSACTION') }}
        </div>
        <div
          class="text-3xl font-black tracking-wider"
          :class="variant === 'success' ? 'text-emerald-600' : 'text-red-600'"
        >
          {{ title || (variant === 'success' ? 'PAID / 已結帳' : 'VOID / 作廢') }}
        </div>
      </div>
    </div>
  </div>
</template>