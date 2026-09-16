<script setup lang="ts">
// 定義規格型別
interface Variant {
  id: string
  name: string
  price: number
  stock: number
}

// 接收父層傳入的商品資訊與開關狀態
defineProps<{
  isOpen: boolean
  productName: string
  variants: Variant[]
}>()

// 定義點選規格與關閉事件
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', variant: Variant): void
}>()
</script>

<template>
  <!-- 遮罩背景：全尺寸保持居中並給予內距防貼邊 -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <!-- 彈窗本體：手機與寬螢幕皆為四邊完整粗黑框 + 立體硬陰影 + 置中 -->
    <div class="bg-white border-2 border-black w-full max-w-sm shadow-[6px_6px_0px_#000] p-5">
      
      <!-- 頂部標題與關閉按鈕 -->
      <div class="flex items-start justify-between pb-3 border-b-2 border-black mb-4">
        <div>
          <span class="text-[10px] font-mono font-black bg-black text-white px-1.5 py-0.5">SELECT VARIANT</span>
          <h2 class="text-base font-black text-zinc-900 mt-1.5 leading-snug">
            {{ productName }}
          </h2>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="font-mono text-xs font-black border-2 border-black px-2 py-1 bg-zinc-100 hover:bg-black hover:text-white transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- 規格點擊列表 -->
      <div class="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
        <button
          v-for="item in variants"
          :key="item.id"
          type="button"
          :disabled="item.stock === 0"
          @click="emit('select', item)"
          :class="[
            'w-full p-3.5 border-2 border-black text-left flex items-center justify-between transition-all select-none',
            item.stock === 0
              ? 'opacity-40 bg-zinc-200 cursor-not-allowed border-dashed'
              : 'bg-zinc-50 hover:bg-amber-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[3px_3px_0px_#000] cursor-pointer'
          ]"
        >
          <div>
            <div class="font-bold text-sm text-zinc-900">{{ item.name }}</div>
            <div class="text-[11px] font-mono text-zinc-500 mt-0.5">
              {{ item.stock > 0 ? `剩餘: ${item.stock}` : 'SOLD OUT' }}
            </div>
          </div>

          <div class="font-mono font-black text-base text-black">
            ${{ item.price }}
          </div>
        </button>
      </div>

      <!-- 底部取消按鈕 -->
      <button
        type="button"
        @click="emit('close')"
        class="mt-4 w-full py-2 bg-white hover:bg-zinc-100 border-2 border-black font-mono font-bold text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition cursor-pointer"
      >
        CANCEL
      </button>

    </div>
  </div>
</template>