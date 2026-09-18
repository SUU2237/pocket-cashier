<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MarketEvent } from '@/stores/events'

const props = defineProps<{
  isOpen: boolean
  event: MarketEvent | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()


const currentTab = ref<'items' | 'orders'>('items')

// 聚合所有訂單項目（維持原樣不變）
interface AggregatedSaleItem {
  key: string
  productName: string
  variantName: string
  price: number
  totalQty: number
  subtotal: number
}

const salesReport = computed(() => {
  if (!props.event || !props.event.orders) {
    return {
      items: [] as AggregatedSaleItem[],
      totalQty: 0,
      totalRevenue: 0,
      orderCount: 0,
    }
  }

  const map = new Map<string, AggregatedSaleItem>()
  let totalQty = 0

  props.event.orders.forEach(order => {
    (order.items || []).forEach(item => {
      const key = item.variantId
      const exist = map.get(key)
      if (exist) {
        exist.totalQty += item.qty
        exist.subtotal += item.price * item.qty
      } else {
        map.set(key, {
          key,
          productName: item.productName,
          variantName: item.variantName,
          price: item.price,
          totalQty: item.qty,
          subtotal: item.price * item.qty,
        })
      }
      totalQty += item.qty
    })
  })

  // 按銷售量由大到小排序
  const items = Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty)
  const totalRevenue = items.reduce((acc, cur) => acc + cur.subtotal, 0)

  return {
    items,
    totalQty,
    totalRevenue,
    orderCount: props.event.orders.length,
  }
})

// 判斷該筆訂單上方是否需要渲染日期分隔線
const getOrderDateDivider = (idx: number): string | null => {
  const orders = props.event?.orders
  if (!orders || orders.length === 0) return null

  const currentOrder = orders[idx]
  if (!currentOrder?.date) return null

  // 1. 最頂部第一筆：永遠顯示最新日期
  if (idx === 0) {
    return currentOrder.date
  }

  // 2. 後續筆數：若此筆日期與「上一筆 (較新)」不同，代表進入新的一天
  const prevOrder = orders[idx - 1]
  if (prevOrder?.date && currentOrder.date !== prevOrder.date) {
    return currentOrder.date
  }

  return null
}
</script>

<template>
  <div
    v-if="isOpen && event"
    class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
  >
    <div class="bg-white border-2 border-black w-full max-w-lg shadow-[6px_6px_0px_#000] flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
      
      <!-- 標題欄 -->
      <header class="p-4 border-b-2 border-black flex items-center justify-between bg-zinc-50">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] font-mono font-bold bg-black text-white px-1.5 py-0.5">SALES REPORT</span>
            <span class="text-xs font-mono text-zinc-500">{{ event.date }}</span>
          </div>
          <h2 class="font-black text-base md:text-lg truncate max-w-75">
            {{ event.name }}
          </h2>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="border-2 border-black p-1 hover:bg-black hover:text-white transition cursor-pointer"
        >
          ✕
        </button>
      </header>

      <!-- 統計大字塊 -->
      <div class="grid grid-cols-3 border-b-2 border-black bg-yellow-50 text-center font-mono">
        <div class="p-3 border-r-2 border-black">
          <div class="text-[10px] text-zinc-500 font-bold uppercase">總營業額</div>
          <div class="text-lg font-black text-black">${{ salesReport.totalRevenue }}</div>
        </div>
        <div class="p-3 border-r-2 border-black">
          <div class="text-[10px] text-zinc-500 font-bold uppercase">售出總數</div>
          <div class="text-lg font-black text-orange-600">{{ salesReport.totalQty }} 件</div>
        </div>
        <div class="p-3">
          <div class="text-[10px] text-zinc-500 font-bold uppercase">總單數</div>
          <div class="text-lg font-black text-zinc-700">{{ salesReport.orderCount }} 筆</div>
        </div>
      </div>

      <!-- 切換按鈕 -->
      <div class="flex border-b-2 border-black bg-zinc-100 font-mono text-xs font-bold shrink-0">
        <button
          type="button"
          @click="currentTab = 'items'"
          class="flex-1 py-2 text-center border-r-2 border-black transition cursor-pointer"
          :class="currentTab === 'items' ? 'bg-white text-black font-black underline decoration-2' : 'text-zinc-500 hover:text-black'"
        >
          銷售統計
        </button>
        <button
          type="button"
          @click="currentTab = 'orders'"
          class="flex-1 py-2 text-center transition cursor-pointer"
          :class="currentTab === 'orders' ? 'bg-white text-black font-black underline decoration-2' : 'text-zinc-500 hover:text-black'"
        >
          逐筆訂單記錄 ({{ event.orders?.length || 0 }})
        </button>
      </div>

      <!-- 明細列表 -->
      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        
        <!-- 銷量統計 -->
        <template v-if="currentTab === 'items'">
          <div
            v-if="salesReport.items.length === 0"
            class="py-10 text-center font-mono text-xs text-zinc-400 border border-dashed border-zinc-300"
          >
            本次活動尚無銷售與結帳紀錄
          </div>

          <div
            v-else
            v-for="(item, idx) in salesReport.items"
            :key="item.key"
            class="p-3 border-2 border-black bg-white flex items-center justify-between shadow-[2px_2px_0px_#000]"
          >
            <div class="min-w-0 flex items-center gap-3">
              <span class="font-mono font-black text-xs text-zinc-400 w-5">#{{ idx + 1 }}</span>
              <div class="truncate">
                <div class="font-bold text-sm text-black truncate">{{ item.productName }}</div>
                <div class="font-mono text-xs text-zinc-500">
                  規格: {{ item.variantName }} · 單價 ${{ item.price }}
                </div>
              </div>
            </div>

            <div class="text-right shrink-0 font-mono ml-2">
              <div class="text-sm font-black text-orange-600">x{{ item.totalQty }}</div>
              <div class="text-xs text-zinc-500 font-bold">${{ item.subtotal }}</div>
            </div>
          </div>
        </template>

        <!-- 筆訂單記錄清單 (含跨日虛線分隔) -->
        <template v-else>
          <div
            v-if="!event.orders || event.orders.length === 0"
            class="py-10 text-center font-mono text-xs text-zinc-400 border border-dashed border-zinc-300"
          >
            尚無任何結帳訂單
          </div>

          <template v-else v-for="(order, idx) in event.orders" :key="order.id">
            <!-- 日期標頭線：最頂部第一筆必顯示，跨日也會自動插入 -->
            <div
              v-if="getOrderDateDivider(idx)"
              class="flex items-center my-3 text-[11px] font-mono text-zinc-400 font-bold"
            >
              <div class="flex-1 border-t-2 border-dashed border-zinc-300"></div>
              <span class="px-3 bg-zinc-200 text-zinc-700 py-0.5 border border-black shadow-[1px_1px_0px_#000]">
                {{ getOrderDateDivider(idx) }}
              </span>
              <div class="flex-1 border-t-2 border-dashed border-zinc-300"></div>
            </div>

            <!-- 訂單卡片本體 -->
            <div class="p-3 border-2 border-black bg-zinc-50 space-y-2 shadow-[2px_2px_0px_#000] text-xs font-mono">
              <div class="flex items-center justify-between border-b border-dashed border-zinc-300 pb-1.5">
                <div class="flex items-center gap-2">
                  <span class="bg-black text-white px-1 py-0.5 text-[10px] font-bold">
                    #{{ event.orders.length - idx }}
                  </span>
                  <span class="text-zinc-500 font-bold">{{ order.createdAt }}</span>
                </div>
                <span class="font-black text-sm">${{ order.totalAmount }}</span>
              </div>

              <div class="space-y-1 text-zinc-700">
                <div
                  v-for="i in order.items"
                  :key="i.variantId"
                  class="flex justify-between"
                >
                  <span class="truncate mr-2">{{ i.productName }} ({{ i.variantName }})</span>
                  <span class="font-bold shrink-0">x{{ i.qty }}</span>
                </div>
              </div>

              <div class="pt-1.5 border-t border-zinc-200 flex justify-between text-[11px] text-zinc-500">
                <span>實收: ${{ order.receivedAmount }}</span>
                <span v-if="order.changeAmount > 0" class="text-emerald-700 font-bold">找零: ${{ order.changeAmount }}</span>
                <span v-else class="text-zinc-400">免找零</span>
              </div>
            </div>
          </template>
        </template>

      </div>

      
      <footer class="p-3 border-t-2 border-black bg-zinc-50">
        <button
          type="button"
          @click="emit('close')"
          class="w-full py-2.5 bg-black text-white hover:bg-zinc-800 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-bold text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition cursor-pointer"
        >
          關閉明細
        </button>
      </footer>
    </div>
  </div>
</template>