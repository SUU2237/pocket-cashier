<script setup lang="ts">
interface Props {
  isOpen: boolean
  title: string
  message: string
  tag?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  alertOnly?: boolean // 若為 true，只顯示單一確認按鈕（替代 alert）
}

withDefaults(defineProps<Props>(), {
  tag: 'ALERT',
  confirmText: '確定',
  cancelText: '取消',
  type: 'danger',
  alertOnly: false,
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    @click.self="emit('cancel')"
  >
    <div class="bg-white border-2 border-black w-full max-w-sm shadow-[6px_6px_0px_#000] p-6 text-center animate-in">
      <!-- 狀態標籤 -->
      <div
        :class="[
          'inline-block border-2 border-black px-3 py-0.5 font-mono font-black text-xs mb-3 shadow-[2px_2px_0px_#000]',
          type === 'danger' ? 'bg-red-400 text-black' : 'bg-yellow-300 text-black'
        ]"
      >
        {{ tag }}
      </div>

      <!-- 標題與說明 -->
      <h3 class="text-base font-black text-black mb-1">
        {{ title }}
      </h3>
      <p class="text-xs font-mono text-zinc-600 max-w-xs mx-auto mb-6">
        {{ message }}
      </p>

      <!-- 按鈕區 -->
      <div :class="['grid gap-3 w-full', alertOnly ? 'grid-cols-1' : 'grid-cols-2']">
        <button
          v-if="!alertOnly"
          type="button"
          @click="emit('cancel')"
          class="py-2.5 bg-white hover:bg-zinc-100 border-2 border-black font-mono font-black text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition cursor-pointer"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          @click="emit('confirm')"
          :class="[
            'py-2.5 text-white border-2 border-black font-mono font-black text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition cursor-pointer',
            type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
          ]"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>