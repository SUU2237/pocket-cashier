<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

export interface VariantStockItem {
  variantId: string
  productName: string
  variantName: string
  category: string
  globalStock: number
  eventStock: number
  selected: boolean
}

const props = defineProps<{
  isOpen: boolean
  eventName: string
  stockList: VariantStockItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', updatedList: VariantStockItem[]): void
}>()

const localList = ref<VariantStockItem[]>([])
const searchQuery = ref('')
const selectedCategory = ref('ALL')

let originalSnapshot = ''
const showConfirmDiscard = ref(false)
const showStockExceededAlert = ref(false)
const invalidStockItemName = ref('')

const resetDraft = () => {
  localList.value = props.stockList.map(item => ({ ...item }))
  originalSnapshot = JSON.stringify(localList.value)
  searchQuery.value = ''
  selectedCategory.value = 'ALL'
  showConfirmDiscard.value = false
  showStockExceededAlert.value = false
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) resetDraft()
  },
  { immediate: true },
)

const categories = computed(() => {
  const set = new Set<string>()
  localList.value.forEach(item => {
    if (item.category) set.add(item.category)
  })
  return ['ALL', ...Array.from(set)]
})

const filteredList = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return localList.value.filter(item => {
    const matchCat = selectedCategory.value === 'ALL' || item.category === selectedCategory.value
    const matchQuery = !q || item.productName.toLowerCase().includes(q) || item.variantName.toLowerCase().includes(q)
    return matchCat && matchQuery
  })
})

const checkIsDirty = () => JSON.stringify(localList.value) !== originalSnapshot

const requestClose = () => {
  if (checkIsDirty()) {
    showConfirmDiscard.value = true
  } else {
    emit('close')
  }
}

const confirmDiscard = () => {
  showConfirmDiscard.value = false
  emit('close')
}

// 儲存前嚴格檢查配額
const handleSave = () => {
  for (const item of localList.value) {
    if (item.selected) {
      if (item.eventStock < 0) item.eventStock = 0
      if (item.eventStock > item.globalStock) {
        invalidStockItemName.value = `${item.productName} (${item.variantName})`
        showStockExceededAlert.value = true
        return
      }
    }
  }

  emit('save', JSON.parse(JSON.stringify(localList.value)))
  emit('close')
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    @click.self="requestClose"
  >
    <div class="bg-white border-2 border-black w-full max-w-2xl shadow-[6px_6px_0px_#000] p-5 flex flex-col max-h-[88vh]">
      
      <!-- 頂部標題與關閉 -->
      <div class="flex items-center justify-between pb-3 border-b-2 border-black mb-3">
        <div>
          <span class="text-[10px] font-mono font-black bg-black text-white px-1.5 py-0.5">EVENT INVENTORY</span>
          <h2 class="text-base font-black text-zinc-900 mt-1">
            商品配置：{{ eventName }}
          </h2>
        </div>
        <button
          type="button"
          @click="requestClose"
          class="font-mono text-xs font-black border-2 border-black px-2 py-0.5 bg-zinc-100 hover:bg-black hover:text-white transition cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- 搜尋與作品快速分類 -->
      <div class="space-y-2 mb-3 pb-3 border-b border-dashed border-zinc-300">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋品名或規格名稱..."
          class="w-full px-3 py-1.5 border-2 border-black font-mono text-xs bg-zinc-50 focus:bg-white focus:outline-none"
        />

        <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span class="text-[10px] font-mono font-bold text-zinc-400 shrink-0">IP:</span>
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            @click="selectedCategory = cat"
            :title="cat"
            :class="[
              'text-xs font-mono font-bold px-2 py-0.5 border-2 border-black transition cursor-pointer shrink-0 truncate max-w-26 text-left',
              selectedCategory === cat
                ? 'bg-black text-white shadow-[2px_2px_0px_#f97316]'
                : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000]'
            ]"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- 配置清單 -->
      <div class="flex-1 overflow-y-auto space-y-2 pr-1">
        <div
          v-if="filteredList.length === 0"
          class="text-center py-12 font-mono text-xs text-zinc-400 border border-zinc-200"
        >
          沒有符合的商品或規格
        </div>

        <div
          v-for="item in filteredList"
          :key="item.variantId"
          :class="[
            'p-3 border-2 border-black flex items-center justify-between gap-3 transition-all',
            item.selected ? 'bg-amber-50/60 shadow-[2px_2px_0px_#000]' : 'bg-zinc-50 opacity-50'
          ]"
        >
          <!-- 自訂橘底白勾 Checkbox -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <label class="relative flex items-center justify-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                v-model="item.selected"
                class="sr-only"
              />
              <div
                :class="[
                  'w-5 h-5 border-2 border-black flex items-center justify-center transition-colors',
                  item.selected ? 'bg-orange-500 shadow-[1px_1px_0px_#000]' : 'bg-white'
                ]"
              >
                <svg
                  v-if="item.selected"
                  class="w-3.5 h-3.5 text-white stroke-3 stroke-white fill-none"
                  viewBox="0 0 24 24"
                >
                  <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </label>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-0.5 min-w-0">
                <span class="text-[9px] font-mono font-bold bg-amber-100 border border-black px-1 truncate max-w-26" :title="item.category">
                  {{ item.category }}
                </span>
                <span class="font-bold text-xs text-zinc-900 truncate flex-1" :title="item.productName">
                  {{ item.productName }}
                </span>
              </div>
              <div class="text-[11px] font-mono text-zinc-500">
                規格: <strong class="text-black">{{ item.variantName }}</strong> (倉庫總存量: {{ item.globalStock }})
              </div>
            </div>
          </div>

          <!-- 現場配額輸入（加上超出標紅樣式） -->
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] font-mono font-bold text-zinc-500">現場配額:</span>
            <input
              v-model.number="item.eventStock"
              type="number"
              min="0"
              :max="item.globalStock"
              :disabled="!item.selected"
              :class="[
                'w-16 border-2 px-2 py-1 text-xs font-mono font-bold bg-white text-right disabled:bg-zinc-200 focus:outline-none',
                item.eventStock > item.globalStock ? 'border-red-500 text-red-600 bg-red-50' : 'border-black'
              ]"
            />
          </div>
        </div>
      </div>

      <!-- 底部操作列 -->
      <div class="pt-4 border-t-2 border-black mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          @click="requestClose"
          class="py-2.5 bg-white hover:bg-zinc-100 border-2 border-black font-mono font-bold text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition cursor-pointer"
        >
          CANCEL
        </button>
        <button
          type="button"
          @click="handleSave"
          class="py-2.5 bg-orange-500 hover:bg-orange-600 border-2 border-black font-mono font-black text-white text-xs tracking-wider shadow-[2px_2px_0px_#000] active:shadow-none transition cursor-pointer"
        >
          SAVE INVENTORY ➔
        </button>
      </div>

    </div>

    <!-- 防呆：配額超出母庫存警告 -->
    <ConfirmModal
      :is-open="showStockExceededAlert"
      title="現場配額不可超過倉庫庫存"
      :message="`現場配額已大於倉庫總庫存，請調低後再儲存。`"
      tag="STOCK OVERFLOW"
      type="warning"
      alert-only
      confirm-text="回去修改"
      @confirm="showStockExceededAlert = false"
      @cancel="showStockExceededAlert = false"
    />

    <!-- 防呆：放棄編輯確認 -->
    <ConfirmModal
      :is-open="showConfirmDiscard"
      title="確定要放棄變更嗎？"
      message="未儲存的商品配置與現場配額將全數捨棄。"
      tag="UNSAVED CHANGES"
      type="danger"
      confirm-text="放棄變更"
      cancel-text="繼續配置"
      @confirm="confirmDiscard"
      @cancel="showConfirmDiscard = false"
    />
  </div>
</template>