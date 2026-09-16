<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useEventStore } from '@/stores/events'
import { useProductStore } from '@/stores/products'

const router = useRouter()
const eventStore = useEventStore()
const productStore = useProductStore()

const { events, activeEvent } = storeToRefs(eventStore)
const { products } = storeToRefs(productStore)

// 營收隱私開關
const isRevealed = ref(false)

// 備忘錄原地編輯開關
const isEditingNote = ref(false)

// 當前活動動態計算
const currentEventDisplay = computed(() => {
  if (!activeEvent.value) {
    return {
      name: '尚未選擇活動',
      date: '----/--/--',
      booth: '未填寫',
      itemCount: 0,
      soldQty: 0,
      totalSales: 0,
    }
  }

  const ev = activeEvent.value
  const configured = (ev.stockConfig || []).filter(s => s.selected)
  const itemCount = configured.length

  // 計算已售件數與總營業額
  const orders = ev.orders || []
  const soldQty = orders.reduce((sum, ord) => {
    return sum + ord.items.reduce((iSum, item) => iSum + item.qty, 0)
  }, 0)
  const totalSales = orders.reduce((sum, ord) => sum + ord.totalAmount, 0)

  return {
    name: ev.name,
    date: ev.date,
    booth: ev.booth,
    itemCount,
    soldQty,
    totalSales,
  }
})

// 備忘錄（綁定到 localStorage，防止重整遺失）
const MEMO_STORAGE_KEY = 'NEO_POS_BOOTH_MEMO'
const boothNote = ref(
  localStorage.getItem(MEMO_STORAGE_KEY) || '找零百鈔在紅色收納盒 / 滿千送會場限定提袋',
)

const saveNote = () => {
  localStorage.setItem(MEMO_STORAGE_KEY, boothNote.value)
  isEditingNote.value = false
}

// 歷史活動清單（取前 2 筆非作用中的活動）
const recentEvents = computed(() => {
  return events.value
    .filter(e => !e.isActive)
    .slice(0, 2)
    .map(e => ({
      id: e.id,
      name: e.name,
      date: e.date,
      sales: (e.orders || []).reduce((sum, o) => sum + o.totalAmount, 0),
    }))
})

// 計算全域母庫存規格總件數與品項總數
const totalGlobalStock = computed(() => {
  return products.value.reduce((acc, p) => {
    return acc + p.variants.reduce((vAcc, v) => vAcc + (Number(v.stock) || 0), 0)
  }, 0)
})

const totalProductCount = computed(() => products.value.length)

// 全域倉庫低庫存預警：只抓取全域母庫存 (products) 中庫存 <= 5 的規格
const stockWarnings = computed(() => {
  const warnings: { name: string; remaining: number }[] = []

  for (const p of products.value) {
    for (const v of p.variants) {
      if (Number(v.stock) <= 5) {
        warnings.push({
          name: `${p.name} (${v.name})`,
          remaining: Number(v.stock),
        })
        if (warnings.length >= 3) break
      }
    }
    if (warnings.length >= 3) break
  }

  return warnings
})
</script>

<template>
  <!-- 外層容器：允許自然滾動，防止 Safari 高度溢出截斷 -->
  <div class="min-h-screen bg-[#f4f4f0] text-black p-4 md:p-8 flex flex-col justify-start">
    <div class="w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto flex-1 flex flex-col">

      <!-- 頂部 Header (固定不被擠壓) -->
      <header class="pb-4 border-b-2 border-black flex items-center justify-between shrink-0 mb-6">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl md:text-2xl font-black tracking-tight">
              POCKET CASHIER
            </h1>
            <span class="text-xs bg-black text-white px-2 py-0.5 font-mono">v1.0</span>
          </div>
          <p class="text-xs font-mono text-zinc-500 mt-1">
            OFFLINE STAND POS & INVENTORY
          </p>
        </div>

        <div class="flex items-center gap-2 bg-white border-2 border-black px-3 py-1 shadow-[2px_2px_0px_#000] shrink-0">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="text-xs font-bold font-mono">READY</span>
        </div>
      </header>

      <!-- 核心區塊：放棄強制等高，改為常規自然流式排列 (items-start) -->
      <main class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        <!-- 左側：當前活動大卡片 -->
        <section class="md:col-span-6 bg-white border-2 border-black p-6 shadow-[5px_5px_0px_#000] flex flex-col gap-6">
          
          <!-- 活動標題與日期 -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-black bg-yellow-300 border border-black px-2 py-0.5 tracking-wider font-mono">
                CURRENT EVENT
              </span>
              <span class="text-xs font-mono text-zinc-500 font-bold">{{ currentEventDisplay.date }}</span>
            </div>

            <h2 class="text-2xl font-black leading-snug break-words">
              {{ currentEventDisplay.name }}
            </h2>
          </div>

          <!-- 攤位便籤 Memo -->
          <div class="bg-zinc-50 border-2 border-dashed border-zinc-300 p-4 relative">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-mono font-black bg-black text-white px-1.5 py-0.5">BOOTH</span>
                <span class="font-mono font-bold text-sm text-zinc-800">{{ currentEventDisplay.booth || '未填寫' }}</span>
              </div>
              <button
                type="button"
                @click="isEditingNote ? saveNote() : (isEditingNote = true)"
                class="text-[10px] font-mono font-bold border border-zinc-400 px-1.5 py-0.5 bg-white hover:bg-black hover:text-white transition cursor-pointer"
              >
                {{ isEditingNote ? 'SAVE' : 'EDIT' }}
              </button>
            </div>

            <div v-if="!isEditingNote" class="text-xs text-zinc-600 font-mono leading-relaxed whitespace-pre-line">
              {{ boothNote || '點擊 EDIT 新增本場備忘...' }}
            </div>
            <textarea
              v-else
              v-model="boothNote"
              rows="2"
              class="w-full text-xs font-mono p-2 border border-black bg-white resize-none focus:outline-none"
              placeholder="輸入攤位備忘事項..."
            ></textarea>
          </div>

          <!-- 數據列與按鈕 -->
          <div class="space-y-4">
            <div class="pt-3 border-t-2 border-dashed border-zinc-200 flex items-center justify-between text-xs font-mono">
              <div class="text-zinc-600 flex gap-3">
                <span>品項: <strong class="text-black">{{ currentEventDisplay.itemCount }}</strong></span>
                <span>已售: <strong class="text-black">{{ currentEventDisplay.soldQty }}</strong></span>
              </div>

              <div class="flex items-center gap-1.5 bg-zinc-100 border border-black px-2 py-1">
                <span class="text-zinc-500">營收:</span>
                <span class="font-bold font-mono">
                  {{ isRevealed ? `$${currentEventDisplay.totalSales}` : '$ ****' }}
                </span>
                <button
                  type="button"
                  @click="isRevealed = !isRevealed"
                  class="ml-1 text-[10px] font-bold bg-white border border-black px-1 hover:bg-black hover:text-white transition cursor-pointer"
                >
                  {{ isRevealed ? 'HIDE' : 'VIEW' }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <button
                type="button"
                @click="router.push('/cashier')"
                class="w-full py-4 bg-orange-500 hover:bg-orange-600 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-black text-white text-lg tracking-wider shadow-[3px_3px_0px_#000] active:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>進入收銀台</span>
                <span class="font-mono text-xl">➔</span>
              </button>

              <button
                type="button"
                @click="router.push('/events')"
                class="w-full py-2.5 bg-white hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-bold text-xs tracking-wider shadow-[2px_2px_0px_#000] active:shadow-none transition-all cursor-pointer"
              >
                本場商品配置與結算
              </button>
            </div>
          </div>

        </section>

        <!-- 右側：功能管理專區 -->
        <section class="md:col-span-6 flex flex-col gap-6">
          
          <!-- 活動清單管理 -->
          <div class="bg-white border-2 border-black p-5 shadow-[5px_5px_0px_#000] flex flex-col justify-between gap-5">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-xs bg-zinc-200 border border-black px-1.5 py-0.5">EVT</span>
                  <h3 class="font-black text-base">活動清單管理</h3>
                </div>
                <button
                  type="button"
                  @click="router.push('/events')"
                  class="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 border border-black px-2 py-1 cursor-pointer"
                >
                  + 新增活動
                </button>
              </div>

              <div class="space-y-1.5 mt-3">
                <div
                  v-if="recentEvents.length === 0"
                  class="text-xs font-mono text-zinc-400 py-4 text-center"
                >
                  尚無其他歷史活動
                </div>
                <div
                  v-for="evt in recentEvents"
                  :key="evt.id"
                  class="flex items-center justify-between p-2 bg-zinc-50 border border-zinc-200 font-mono text-xs"
                >
                  <span class="font-bold text-zinc-800 truncate max-w-40">{{ evt.name }}</span>
                  <span class="text-zinc-500 shrink-0">{{ evt.date }} · ${{ evt.sales }}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              @click="router.push('/events')"
              class="w-full py-2.5 bg-white hover:bg-amber-50 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-black text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition-all flex items-center justify-between px-3 cursor-pointer"
            >
              <span>切換歷史活動 / 數據對帳</span>
              <span class="font-mono">➔</span>
            </button>
          </div>

          <!-- 全域商品倉庫 -->
          <div class="bg-white border-2 border-black p-5 shadow-[5px_5px_0px_#000] flex flex-col justify-between gap-5">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-xs bg-zinc-200 border border-black px-1.5 py-0.5">INV</span>
                  <h3 class="font-black text-base">全域商品倉庫</h3>
                </div>
                <span class="text-xs font-mono font-bold text-zinc-500">
                  {{ totalProductCount }} 品項 · {{ totalGlobalStock }} 件
                </span>
              </div>

              <div class="space-y-1.5 mt-3">
                <div
                  v-if="products.length === 0"
                  class="text-xs font-mono text-zinc-400 py-4 text-center"
                >
                  倉庫尚無商品，點擊下方前往新增
                </div>
                <div
                  v-else-if="stockWarnings.length === 0"
                  class="text-xs font-mono text-emerald-600 py-2.5 px-2 bg-emerald-50 border border-emerald-300 flex items-center justify-between"
                >
                  <span>庫存水位正常</span>
                  <span class="font-bold">ALL OK</span>
                </div>
                <div
                  v-else
                  v-for="(stock, index) in stockWarnings"
                  :key="index"
                  class="flex items-center justify-between p-2 bg-amber-50/70 border border-amber-300 font-mono text-xs"
                >
                  <span class="font-bold text-zinc-800 truncate max-w-40" :title="stock.name">{{ stock.name }}</span>
                  <span class="text-orange-600 font-bold shrink-0">剩餘 {{ stock.remaining }}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="w-full py-2.5 bg-white hover:bg-amber-50 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-black text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition-all flex items-center justify-between px-3 cursor-pointer"
              @click="router.push('/inventory')"
            >
              <span>管理全部商品與規格 ({{ totalProductCount }})</span>
              <span class="font-mono">➔</span>
            </button>
          </div>

        </section>

      </main>

      <!-- 底部資訊條 (改用 mt-auto 與 pt-8，永遠位在所有卡片之下，不再使用 justify-between 盲目分配空間) -->
      <footer class="mt-auto pt-8 pb-2 border-t-2 border-black flex justify-between items-center text-xs font-mono text-zinc-500 shrink-0">
        <span>LOCAL STORAGE MODE</span>
        <span>NO NETWORK REQUIRED</span>
      </footer>

    </div>
  </div>
</template>