<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useEventStore, type MarketEvent, type EventStockItem } from '@/stores/events'
import { useProductStore } from '@/stores/products'
import EventEditModal, { type EventFormData } from '@/components/EventEditModal.vue'
import EventStockModal, { type VariantStockItem } from '@/components/EventStockModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const router = useRouter()
const eventStore = useEventStore()
const productStore = useProductStore()

const { events } = storeToRefs(eventStore)
const { products } = storeToRefs(productStore)

const searchQuery = ref('')
const isEditModalOpen = ref(false)
const editingEvent = ref<EventFormData | null>(null)
const deleteTargetId = ref<string | null>(null)

// 帶貨/配置彈窗狀態
const isStockModalOpen = ref(false)
const currentStockingEvent = ref<MarketEvent | null>(null)

// 將全域商品與該場次既有配額組合為配置清單
const currentStockList = computed<VariantStockItem[]>(() => {
  if (!currentStockingEvent.value) return []
  const currentConfig = currentStockingEvent.value.stockConfig || []

  const list: VariantStockItem[] = []
  products.value.forEach(prod => {
    prod.variants.forEach(variant => {
      const existing = currentConfig.find(c => c.variantId === variant.id)
      list.push({
        variantId: variant.id,
        productName: prod.name,
        variantName: variant.name,
        category: prod.category,
        globalStock: Number(variant.stock) || 0,
        eventStock: existing ? existing.eventStock : 0,
        selected: existing ? existing.selected : false,
      })
    })
  })
  return list
})

const openCreateModal = () => {
  editingEvent.value = null
  isEditModalOpen.value = true
}

const openEditModal = (ev: MarketEvent) => {
  editingEvent.value = {
    id: ev.id,
    name: ev.name,
    date: ev.date,
    booth: ev.booth,
  }
  isEditModalOpen.value = true
}

const openStockModal = (ev: MarketEvent) => {
  currentStockingEvent.value = ev
  isStockModalOpen.value = true
}

const setActiveEvent = (id: string) => {
  eventStore.setActiveEvent(id)
}

const askDelete = (id: string) => {
  deleteTargetId.value = id
}

const confirmDelete = () => {
  if (deleteTargetId.value) {
    eventStore.deleteEvent(deleteTargetId.value)
    deleteTargetId.value = null
  }
}

const handleSaveEvent = (data: EventFormData) => {
  if (data.id) {
    eventStore.updateEvent(data.id, {
      name: data.name,
      date: data.date,
      booth: data.booth,
    })
  } else {
    eventStore.addEvent({
      name: data.name,
      date: data.date,
      booth: data.booth,
    })
  }
}

const handleSaveStock = (updated: VariantStockItem[]) => {
  if (!currentStockingEvent.value) return

  // 轉換為 Store 存檔格式，並回寫單價
  const configToSave: EventStockItem[] = updated.map(item => {
    let price = 0
    for (const p of products.value) {
      const v = p.variants.find(targetV => targetV.id === item.variantId)
      if (v) {
        price = Number(v.price) || 0
        break
      }
    }

    return {
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      category: item.category,
      price,
      eventStock: item.selected ? item.eventStock : 0,
      selected: item.selected,
    }
  })

  eventStore.updateStockConfig(currentStockingEvent.value.id, configToSave)
}

const getEventItemCount = (ev: MarketEvent) => {
  return (ev.stockConfig || []).filter(s => s.selected && s.eventStock > 0).length
}

const getEventRevenue = (ev: MarketEvent) => {
  return (ev.orders || []).reduce((sum, order) => sum + order.totalAmount, 0)
}

const filteredEvents = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return events.value
  return events.value.filter(e =>
    e.name.toLowerCase().includes(q) || e.booth.toLowerCase().includes(q),
  )
})
</script>

<template>
  <div class="min-h-screen bg-[#f4f4f0] text-black flex flex-col justify-between p-4 md:p-8">
    <div class="w-full max-w-4xl mx-auto flex-1 flex flex-col gap-5">

      <!-- 頂部 Header -->
      <header class="pb-4 border-b-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="router.push('/')"
            class="font-mono text-xs font-black border-2 border-black px-2.5 py-1.5 bg-white hover:bg-black hover:text-white transition cursor-pointer"
          >
            &lt; HOME
          </button>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl md:text-2xl font-black tracking-tight">
                場次活動管理
              </h1>
              <span class="text-xs bg-black text-white px-2 py-0.5 font-mono">EVENTS</span>
            </div>
            <p class="text-xs font-mono text-zinc-500 mt-0.5">
              設定當前擺攤場次、攜帶商品庫存與營收對帳
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋活動 / 攤位..."
            class="px-3 py-1.5 border-2 border-black font-mono text-xs bg-white focus:outline-none w-36 md:w-52"
          />
          <button
            type="button"
            @click="openCreateModal"
            class="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-black text-white text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition cursor-pointer shrink-0"
          >
            + NEW EVENT
          </button>
        </div>
      </header>

      <!-- 活動卡片列表 -->
      <main class="space-y-4">
        <div v-if="filteredEvents.length === 0" class="text-center py-20 bg-white border-2 border-black p-8 shadow-[4px_4px_0px_#000]">
          <p class="font-mono text-sm text-zinc-500 font-bold">沒有相符的活動場次</p>
        </div>

        <div
          v-for="ev in filteredEvents"
          :key="ev.id"
          :class="[
            'border-2 border-black p-5 transition-all relative',
            ev.isActive
              ? 'bg-white shadow-[6px_6px_0px_#f97316]'
              : 'bg-zinc-50 shadow-[4px_4px_0px_#000]'
          ]"
        >
          <div
            v-if="ev.isActive"
            class="absolute -top-3 right-4 bg-orange-500 text-white border-2 border-black px-2 py-0.5 font-mono font-black text-[10px] shadow-[2px_2px_0px_#000]"
          >
            CURRENT ACTIVE
          </div>

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono text-xs font-bold text-zinc-500">
                  {{ ev.date }}
                </span>
                <span class="text-xs font-mono bg-zinc-200 border border-black px-1.5 py-0.2">
                  攤位: {{ ev.booth }}
                </span>
              </div>
              <h2 class="text-lg font-black text-black">
                {{ ev.name }}
              </h2>
            </div>

            <!-- 數據統計 -->
            <div class="flex items-center gap-6 font-mono">
              <div>
                <div class="text-[10px] text-zinc-500 uppercase font-bold">上架規格</div>
                <div class="text-sm font-black text-black">{{ getEventItemCount(ev) }} ITEMS</div>
              </div>
              <div class="border-l border-dashed border-zinc-300 pl-6">
                <div class="text-[10px] text-zinc-500 uppercase font-bold">累計營收</div>
                <div class="text-lg font-black text-emerald-600">${{ getEventRevenue(ev) }}</div>
              </div>
            </div>
          </div>

          <!-- 動作按鈕列 -->
          <div class="mt-4 pt-3 border-t border-dashed border-zinc-300 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <button
                v-if="!ev.isActive"
                type="button"
                @click="setActiveEvent(ev.id)"
                class="text-xs font-mono font-bold bg-white hover:bg-black hover:text-white border border-black px-2.5 py-1 transition cursor-pointer"
              >
                切換為進行中場次
              </button>
              <span v-else class="text-xs font-mono font-black text-orange-600 flex items-center gap-1">
                ● 收銀台連動中
              </span>

              <button
                type="button"
                @click="openStockModal(ev)"
                class="text-xs font-mono font-bold border border-black px-2.5 py-1 bg-amber-100 hover:bg-amber-200 transition cursor-pointer"
              >
                CONFIG (商品配置)
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="openEditModal(ev)"
                class="text-xs font-mono font-bold border border-black px-2.5 py-1 bg-zinc-100 hover:bg-black hover:text-white transition cursor-pointer"
              >
                EDIT
              </button>
              <button
                type="button"
                :disabled="ev.isActive"
                @click="askDelete(ev.id)"
                class="text-xs font-mono font-bold border border-black px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                DEL
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer class="pt-4 border-t-2 border-black flex justify-between items-center text-xs font-mono text-zinc-500">
        <span>EVENTS TOTAL: {{ events.length }}</span>
        <span>OFFLINE READY</span>
      </footer>

    </div>

    <EventEditModal
      :is-open="isEditModalOpen"
      :initial-data="editingEvent"
      @close="isEditModalOpen = false"
      @save="handleSaveEvent"
    />

    <EventStockModal
      :is-open="isStockModalOpen"
      :event-name="currentStockingEvent?.name ?? ''"
      :stock-list="currentStockList"
      @close="isStockModalOpen = false"
      @save="handleSaveStock"
    />

    <ConfirmModal
      :is-open="!!deleteTargetId"
      title="確定刪除此場次？"
      message="刪除後該場次的歷史營收紀錄與上架配置將一併移除。"
      tag="DELETE EVENT"
      type="danger"
      confirm-text="確定刪除"
      cancel-text="取消"
      @confirm="confirmDelete"
      @cancel="deleteTargetId = null"
    />
  </div>
</template>