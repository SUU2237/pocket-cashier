<script setup lang="ts">
import { onMounted } from 'vue'
import { useStorageStore } from '@/stores/storage'

const storageStore = useStorageStore()

onMounted(() => {
  storageStore.calculateUsage()
})
</script>

<template>
  <aside
    v-if="storageStore.isNearFull || storageStore.isStorageError"
    class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-[#ff4b4b] text-white border-2 border-black p-4 shadow-[5px_5px_0px_#000] font-mono animate-bounce"
    role="alert"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xl">⚠️</span>
        <h4 class="font-black text-sm tracking-wider uppercase">
          {{ storageStore.isStorageError ? '儲存空間已滿 (FULL)' : '離線容量即將耗盡' }}
        </h4>
      </div>
      <button
        type="button"
        @click="storageStore.dismissError"
        class="text-xs border border-white px-2 py-0.5 hover:bg-white hover:text-black transition cursor-pointer"
        title="關閉提示"
      >
        ✕
      </button>
    </div>

    <p class="text-xs text-zinc-100 mt-2 leading-relaxed">
      目前已使用 <strong>{{ storageStore.formattedUsed }}</strong> (約 {{ storageStore.usagePercentage }}%)。
      {{ storageStore.isStorageError ? '資料寫入失敗！請刪除歷史活動、移除部分商品圖片或進行備份。' : '空間接近 5MB 上限，建議清理無用的商品圖片或歷史場次。' }}
    </p>

    <!-- 進度條 -->
    <div class="w-full h-3 border border-black bg-white mt-3 overflow-hidden">
      <div
        class="h-full bg-black transition-all duration-300"
        :style="{ width: `${storageStore.usagePercentage}%` }"
      ></div>
    </div>
  </aside>
</template>