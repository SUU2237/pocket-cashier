<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProductStore, type Product } from '@/stores/products'
import ProductEditModal, { type ProductFormData } from '@/components/ProductEditModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const router = useRouter()
const productStore = useProductStore()
const { products } = storeToRefs(productStore) // 響應式讀取 Pinia 中的全域母庫存

const searchQuery = ref('')
const selectedCategory = ref('ALL')

// 動態取得所有既有的作品分類標籤
const categories = computed(() => {
  const set = new Set<string>()
  products.value.forEach(p => {
    if (p.category) set.add(p.category)
  })
  return ['ALL', ...Array.from(set)]
})

const isModalOpen = ref(false)
const editingProduct = ref<ProductFormData | null>(null)
const deleteTargetId = ref<string | null>(null)

const openCreateModal = () => {
  editingProduct.value = null
  isModalOpen.value = true
}

const openEditModal = (product: Product) => {
  editingProduct.value = {
    id: product.id,
    name: product.name,
    category: product.category,
    imageUrl: product.imageUrl || '',
    variants: product.variants.map(v => ({ ...v })),
  }
  isModalOpen.value = true
}

const askDelete = (id: string) => {
  deleteTargetId.value = id
}

const confirmDelete = () => {
  if (deleteTargetId.value) {
    productStore.deleteProduct(deleteTargetId.value)
    deleteTargetId.value = null
  }
}

// 儲存：呼叫 Pinia action 寫入並自動觸發 localStorage 持久化
const handleSave = (savedData: ProductFormData) => {
  const cleanVariants = savedData.variants.map(v => ({
    id: v.id,
    name: v.name,
    price: Math.max(0, Number(v.price) || 0),
    stock: Math.max(0, Number(v.stock) || 0),
  }))

  if (savedData.id) {
    productStore.updateProduct({
      id: savedData.id,
      name: savedData.name,
      category: savedData.category,
      imageUrl: savedData.imageUrl || '',
      variants: cleanVariants,
    })
  } else {
    productStore.addProduct({
      name: savedData.name,
      category: savedData.category,
      imageUrl: savedData.imageUrl || '',
      variants: cleanVariants,
    })
  }
}

// 搜尋與作品分類過濾
const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchCategory = selectedCategory.value === 'ALL' || p.category === selectedCategory.value
    const matchQuery = !searchQuery.value.trim() || p.name.toLowerCase().includes(searchQuery.value.trim().toLowerCase())
    return matchCategory && matchQuery
  })
})

const getTotalStock = (variants: Product['variants']) => {
  return variants.reduce((acc, cur) => acc + (Number(cur.stock) || 0), 0)
}
</script>

<template>
  <div class="min-h-screen bg-[#f4f4f0] text-black flex flex-col justify-between p-4 md:p-8">
    <div class="w-full max-w-5xl mx-auto flex-1 flex flex-col gap-5">

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
                全域商品倉庫
              </h1>
              <span class="text-xs bg-black text-white px-2 py-0.5 font-mono">INVENTORY</span>
            </div>
            <p class="text-xs font-mono text-zinc-500 mt-0.5">
              維護全域商品庫存與規格定價
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋品名..."
            class="px-3 py-1.5 border-2 border-black font-mono text-xs bg-white focus:outline-none w-36 md:w-52"
          />
          <button
            type="button"
            @click="openCreateModal"
            class="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-black text-white text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition cursor-pointer"
          >
            + NEW ITEM
          </button>
        </div>
      </header>

      <!-- 作品分類標籤列 (Tailwind v4 簡寫: max-w-26) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <span class="text-[10px] font-mono font-bold text-zinc-400 shrink-0">IP:</span>
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          @click="selectedCategory = cat"
          :title="cat"
          :class="[
            'text-xs font-mono font-bold px-2.5 py-1 border-2 border-black transition cursor-pointer shrink-0 truncate max-w-26 text-left',
            selectedCategory === cat
              ? 'bg-black text-white shadow-[2px_2px_0px_#f97316]'
              : 'bg-white text-black hover:bg-zinc-100 shadow-[2px_2px_0px_#000]'
          ]"
        >
          {{ cat }}
        </button>
      </div>

      <!-- 商品列表 -->
      <main class="flex-1">
        <div v-if="filteredProducts.length === 0" class="text-center py-20 bg-white border-2 border-black p-8 shadow-[4px_4px_0px_#000]">
          <p class="font-mono text-sm text-zinc-500 font-bold">此分類下沒有相符的商品</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="prod in filteredProducts"
            :key="prod.id"
            class="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000] flex flex-col justify-between gap-3"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                <span class="text-[10px] font-mono font-bold bg-amber-100 border border-black px-1.5 py-0.5 truncate max-w-35 sm:max-w-48" :title="prod.category">
                  {{ prod.category }}
                </span>
                <span class="text-xs font-mono font-bold bg-zinc-100 border border-black px-2 py-0.5 shrink-0">
                  庫存: {{ getTotalStock(prod.variants) }}
                </span>
              </div>

              <h3 class="font-black text-base text-zinc-900 leading-snug wrap-break-word">
                {{ prod.name }}
              </h3>

              <div class="space-y-1 mt-3">
                <div
                  v-for="v in prod.variants"
                  :key="v.id"
                  class="flex items-center justify-between text-xs font-mono p-1.5 bg-zinc-50 border border-zinc-200 min-w-0"
                >
                  <span class="font-bold text-zinc-700 truncate mr-2 flex-1" :title="v.name">
                    {{ v.name }}
                  </span>
                  <div class="shrink-0 flex gap-3 text-zinc-500">
                    <span>庫存: <strong class="text-black">{{ v.stock }}</strong></span>
                    <span class="font-bold text-black font-mono">${{ v.price }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-dashed border-zinc-300 flex items-center justify-between font-mono">
              <span class="text-[10px] text-zinc-400">
                {{ prod.variants.length }} 種規格
              </span>
              <div class="flex gap-2">
                <button
                  type="button"
                  @click="openEditModal(prod)"
                  class="text-xs font-bold border border-black px-2.5 py-1 bg-zinc-100 hover:bg-black hover:text-white transition cursor-pointer"
                >
                  EDIT
                </button>
                <button
                  type="button"
                  @click="askDelete(prod.id)"
                  class="text-xs font-bold border border-black px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition cursor-pointer"
                >
                  DEL
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      <!-- 底部狀態列 -->
      <footer class="pt-4 border-t-2 border-black flex justify-between items-center text-xs font-mono text-zinc-500">
        <span>ITEMS TOTAL: {{ products.length }}</span>
        <span>CATEGORY: {{ selectedCategory }}</span>
      </footer>

    </div>

    <!-- 編輯彈窗 -->
    <ProductEditModal
      :is-open="isModalOpen"
      :initial-data="editingProduct"
      @close="isModalOpen = false"
      @save="handleSave"
    />

    <!-- 刪除商品專用 ConfirmModal -->
    <ConfirmModal
      :is-open="!!deleteTargetId"
      title="確定要刪除此商品嗎？"
      message="刪除後全域商品庫存資料將直接移除，無法復原。"
      tag="DELETE ITEM"
      type="danger"
      confirm-text="確定刪除"
      cancel-text="取消"
      @confirm="confirmDelete"
      @cancel="deleteTargetId = null"
    />
  </div>
</template>