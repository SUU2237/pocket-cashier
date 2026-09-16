<script setup lang="ts">
// 購物車品項型別
interface CartItem {
  id: string
  productId: string
  name: string
  variantName?: string
  price: number
  qty: number
}

defineProps<{
  isOpen: boolean
  items: CartItem[]
  totalAmount: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update-qty', itemId: string, newQty: number): void
  (e: 'remove-item', itemId: string): void
  (e: 'clear-cart'): void
}>()
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white border-2 border-black w-full max-w-md shadow-[6px_6px_0px_#000] p-5 flex flex-col max-h-[85vh]">
      
      <!-- 頂部標題與快捷清空 -->
      <div class="flex items-center justify-between pb-3 border-b-2 border-black mb-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-black bg-black text-white px-1.5 py-0.5">CART</span>
          <h2 class="text-base font-black text-zinc-900">購物車明細</h2>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="items.length > 0"
            type="button"
            @click="emit('clear-cart')"
            class="text-[10px] font-mono font-bold border border-red-500 text-red-600 px-1.5 py-0.5 hover:bg-red-50 cursor-pointer"
          >
            CLEAR ALL
          </button>
          <button
            type="button"
            @click="emit('close')"
            class="font-mono text-xs font-black border-2 border-black px-2 py-0.5 bg-zinc-100 hover:bg-black hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- 購物車清單列表 -->
      <div class="flex-1 overflow-y-auto space-y-2.5 my-2 pr-1">
        <div
          v-if="items.length === 0"
          class="text-center py-10 font-mono text-xs text-zinc-400"
        >
          購物車目前是空的
        </div>

        <div
          v-for="item in items"
          :key="item.id"
          class="p-3 bg-zinc-50 border-2 border-black flex items-center justify-between gap-3 select-none"
        >
          <!-- 品名與單價 -->
          <div class="min-w-0 flex-1">
            <div class="font-bold text-sm text-zinc-900 truncate">
              {{ item.name }}
            </div>
            <div class="text-[11px] font-mono text-zinc-500 flex items-center gap-2 mt-0.5">
              <span v-if="item.variantName" class="bg-zinc-200 px-1 text-black font-bold">
                {{ item.variantName }}
              </span>
              <span>單價: ${{ item.price }}</span>
            </div>
          </div>

          <!-- 數量調整控制器 (+ / - / 數量) -->
            <div class="flex items-center gap-1 shrink-0">
            <button
                type="button"
                @click="emit('update-qty', item.id, item.qty - 1)"
                class="w-7 h-7 bg-white border-2 border-black font-mono font-black text-sm flex items-center justify-center hover:bg-zinc-200 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
                -
            </button>
            <span class="w-7 text-center font-mono font-black text-sm text-black">
                {{ item.qty }}
            </span>
            <button
                type="button"
                @click="emit('update-qty', item.id, item.qty + 1)"
                class="w-7 h-7 bg-white border-2 border-black font-mono font-black text-sm flex items-center justify-center hover:bg-zinc-200 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
                +
            </button>
            </div>

            <!-- 右側小計與刪除：固定寬度 w-16、禁止縮放 shrink-0、靠右對齊 -->
            <div class="w-16 shrink-0 text-right pl-2 border-l border-dashed border-zinc-300 flex flex-col justify-center">
            <div class="font-mono font-black text-sm text-black truncate">
                ${{ item.price * item.qty }}
            </div>
            <button
                type="button"
                @click="emit('remove-item', item.id)"
                class="text-[10px] font-mono text-zinc-400 hover:text-red-600 underline cursor-pointer mt-0.5 text-right"
            >
                DEL
            </button>
            </div>
        </div>
      </div>

      <!-- 底部總結與確認按鈕 -->
      <div class="pt-3 border-t-2 border-black mt-2 space-y-3">
        <div class="flex items-baseline justify-between font-mono">
          <span class="text-xs font-bold text-zinc-500">TOTAL</span>
          <span class="text-2xl font-black text-orange-600">${{ totalAmount }}</span>
        </div>

        <button
          type="button"
          @click="emit('close')"
          class="w-full py-3 bg-orange-500 hover:bg-orange-600 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-black text-white text-sm tracking-wider shadow-[3px_3px_0px_#000] active:shadow-none transition-all cursor-pointer"
        >
          確認並返回收銀
        </button>
      </div>

    </div>
  </div>
</template>