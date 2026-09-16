<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useEventStore, type EventStockItem } from '@/stores/events'
import { useProductStore, type VariantItem } from '@/stores/products'
import VariantModal from '@/components/VariantModal.vue'
import CartDrawer from '@/components/CartDrawer.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import EventSalesModal from '@/components/EventSalesModal.vue'

const router = useRouter()
const eventStore = useEventStore()
const { activeEvent } = storeToRefs(eventStore)

// 購物車項目
export interface CartItem {
  id: string
  productId: string
  name: string
  variantId: string
  productName: string
  variantName: string
  price: number
  qty: number
  maxStock: number
}

const cartItems = ref<CartItem[]>([])
const receivedAmount = ref(0)
const isModalOpen = ref(false)
const isCartDrawerOpen = ref(false)
const isSalesModalOpen = ref(false)
const showResetConfirm = ref(false)
const showNoStockAlert = ref(false)
const showCheckoutSuccess = ref(false)
const lastCheckoutSummary = ref({ total: 0, change: 0 })
const isCartCheckOpen = ref(false)



// 依商品名稱聚合該活動已配置的規格清單
interface DisplayProduct {
  name: string
  category: string
  totalStock: number
  priceText: string
  hasMultipleVariants: boolean
  cartQty: number
  imageUrl?: string
  variants: EventStockItem[]
}

// 引入 ProductStore 取得最新品名與單價
const productStore = useProductStore()
const { products } = storeToRefs(productStore)

const shelfProducts = computed<DisplayProduct[]>(() => {
  if (!activeEvent.value) return []
  const configured = (activeEvent.value.stockConfig || []).filter(item => item.selected)

  const groupMap = new Map<string, EventStockItem[]>()

  configured.forEach(item => {
    // 從母庫存動態搜尋最新品名與售價
    let livePrice = item.price
    let liveName = item.productName
    let liveVariantName = item.variantName
    let liveCategory = item.category
    let liveImg = ''

    for (const p of products.value) {
      const v = p.variants.find(targetV => targetV.id === item.variantId)
      if (v) {
        livePrice = Number(v.price) || 0
        liveName = p.name
        liveVariantName = v.name
        liveCategory = p.category
        liveImg = p.imageUrl || ''
        break
      }
    }

    const liveItem: EventStockItem = {
      ...item,
      productName: liveName,
      variantName: liveVariantName,
      category: liveCategory,
      price: livePrice,
    }

    const list = groupMap.get(liveName) || []
    list.push(liveItem)
    groupMap.set(liveName, list)
  })

  const results: DisplayProduct[] = []
  groupMap.forEach((variants, name) => {
    const totalStock = variants.reduce((acc, v) => acc + v.eventStock, 0)
    const prices = variants.map(v => v.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceText = minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`
    const matched = products.value.find(p => p.name === name)
    const itemImage = matched?.imageUrl || ''

    const cartQty = cartItems.value
      .filter(c => c.productName === name)
      .reduce((acc, c) => acc + c.qty, 0)

    results.push({
      name,
      category: variants[0]?.category || '未分類',
      imageUrl: itemImage,
      totalStock,
      priceText,
      hasMultipleVariants: variants.length > 1,
      cartQty,
      variants,
    })
  })

  return results
})

// 多規格彈窗所需資料
const selectedProduct = ref<DisplayProduct | null>(null)
const modalVariants = computed(() => {
  if (!selectedProduct.value) return []
  return selectedProduct.value.variants.map(v => ({
    id: v.variantId,
    name: v.variantName,
    price: v.price,
    stock: v.eventStock,
  }))
})

const cartSummary = computed(() => {
  const totalQty = cartItems.value.reduce((acc, cur) => acc + cur.qty, 0)
  const totalAmount = cartItems.value.reduce((acc, cur) => acc + (cur.price * cur.qty), 0)
  return { totalQty, totalAmount }
})

const changeAmount = computed(() => {
  if (receivedAmount.value >= cartSummary.value.totalAmount) {
    return receivedAmount.value - cartSummary.value.totalAmount
  }
  return 0
})

const addVariantToCart = (
  variant: { id: string; name: string; price: number; stock: number },
  productName: string,
) => {
  const exist = cartItems.value.find(c => c.variantId === variant.id)
  const currentQty = exist ? exist.qty : 0

  if (currentQty >= variant.stock) {
    showNoStockAlert.value = true
    return
  }

  if (exist) {
    exist.qty += 1
  } else {
    cartItems.value.push({
      id: `cart_${Date.now()}_${variant.id}`,
      productId: variant.id, // 對齊 CartDrawer 必填欄位
      name: productName,     // 對齊 CartDrawer 必填欄位
      variantId: variant.id,
      productName,
      variantName: variant.name,
      price: variant.price,
      qty: 1,
      maxStock: variant.stock,
    })
  }
}

const handleProductClick = (prod: DisplayProduct) => {
  if (prod.totalStock <= 0) return

  if (prod.hasMultipleVariants) {
    selectedProduct.value = prod
    isModalOpen.value = true
  } else {
    const single = prod.variants[0]
    if (single) {
      addVariantToCart({
        id: single.variantId,
        name: single.variantName,
        price: single.price,
        stock: single.eventStock,
      }, prod.name)
    }
  }
}

const handleSelectVariantFromModal = (variant: any) => {
  if (!selectedProduct.value) return
  addVariantToCart(variant, selectedProduct.value.name)
  isModalOpen.value = false
}

const handleUpdateQty = (id: string, newQty: number) => {
  const target = cartItems.value.find(i => i.id === id)
  if (!target) return

  if (newQty <= 0) {
    cartItems.value = cartItems.value.filter(i => i.id !== id)
  } else if (newQty > target.maxStock) {
    showNoStockAlert.value = true
  } else {
    target.qty = newQty
  }
}

const handleRemoveItem = (id: string) => {
  cartItems.value = cartItems.value.filter(i => i.id !== id)
}

const handleClearCart = () => {
  cartItems.value = []
  receivedAmount.value = 0
}

const addCash = (amount: number) => {
  receivedAmount.value += amount
}

const setExact = () => {
  receivedAmount.value = cartSummary.value.totalAmount
}

const clearCash = () => {
  receivedAmount.value = 0
}

// 結帳扣庫存並寫入訂單紀錄
const handleCheckout = () => {
  if (cartItems.value.length === 0 || !activeEvent.value) return

  const total = cartSummary.value.totalAmount
  const received = receivedAmount.value < total ? total : receivedAmount.value
  const change = received - total

  eventStore.recordOrder({
    eventId: activeEvent.value.id,
    items: cartItems.value.map(c => ({
      variantId: c.variantId,
      productName: c.productName,
      variantName: c.variantName,
      price: c.price,
      qty: c.qty,
    })),
    totalAmount: total,
    receivedAmount: received,
    changeAmount: change,
  })

  lastCheckoutSummary.value = { total, change }
  showCheckoutSuccess.value = true
  handleClearCart()
  isCartCheckOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[#f4f4f0] text-black flex flex-col justify-between">
    <!-- 頂部導覽列 -->
    <header class="bg-white border-b-2 border-black px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/')"
          class="font-mono text-xs font-black border-2 border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition cursor-pointer"
        >
          &lt; BACK
        </button>
        <div>
          <h1 class="text-sm md:text-base font-black truncate max-w-45 md:max-w-xs">
            {{ activeEvent ? activeEvent.name : '尚未選擇活動' }}
          </h1>
          <span class="text-[10px] font-mono text-zinc-500">
            {{ activeEvent ? `攤位: ${activeEvent.booth}` : '請先至活動管理選擇場次' }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="isSalesModalOpen = true"
          class="text-xs font-mono font-bold border-2 border-black px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
        >
          TOTAL
        </button>
        <button
          type="button"
          @click="showResetConfirm = true"
          class="text-xs font-mono font-bold border-2 border-black px-2.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 transition cursor-pointer"
        >
          RESET
        </button>
      </div>
    </header>

    <!-- 主工作區 -->
    <main class="flex-1 max-w-6xl w-full mx-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start pb-6">
      
      <!-- 貨架列表 -->
      <section class="lg:col-span-8">
        <div v-if="!activeEvent" class="bg-white border-2 border-black p-8 text-center shadow-[4px_4px_0px_#000]">
          <p class="font-mono text-sm font-bold text-zinc-500 mb-3">目前沒有進行中的活動場次</p>
          <button
            type="button"
            @click="router.push('/events')"
            class="px-4 py-2 bg-black text-white font-mono text-xs font-bold"
          >
            前往設定活動 ➔
          </button>
        </div>

        <div v-else-if="shelfProducts.length === 0" class="bg-white border-2 border-black p-8 text-center shadow-[4px_4px_0px_#000]">
          <p class="font-mono text-sm font-bold text-zinc-500 mb-3">本場次尚未配置任何商品品項</p>
          <button
            type="button"
            @click="router.push('/events')"
            class="px-4 py-2 bg-orange-500 text-white font-mono text-xs font-bold border-2 border-black shadow-[2px_2px_0px_#000]"
          >
            前往配置商品配額 ➔
          </button>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          <div
            v-for="item in shelfProducts"
            :key="item.name"
            @click="handleProductClick(item)"
            :class="[
              'relative bg-white border-2 border-black p-3.5 flex flex-col justify-between select-none cursor-pointer transition-all',
              item.totalStock === 0 
                ? 'opacity-40 cursor-not-allowed bg-zinc-200' 
                : 'shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:bg-amber-50/40'
            ]"
          >
            <div
              v-if="item.cartQty > 0"
              class="absolute -top-2 -right-2 bg-orange-500 text-white font-mono font-black text-xs px-2 py-0.5 border-2 border-black shadow-[2px_2px_0px_#000]"
            >
              x{{ item.cartQty }}
            </div>

            <div class="w-full aspect-square bg-zinc-100 border border-black mb-2.5 flex items-center justify-center text-zinc-400 font-mono text-xs">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.name"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-zinc-400 font-mono text-xs font-bold">[IMG]</span>
            </div>

            <div>
              <div class="flex items-center gap-1 mb-1">
                <span 
                  v-if="item.hasMultipleVariants"
                  class="text-[9px] font-mono font-bold bg-zinc-200 border border-black px-1"
                >
                  MULTI
                </span>
                <span class="text-[10px] font-mono text-zinc-500">
                  {{ item.totalStock > 0 ? `現場剩餘:${item.totalStock}` : 'SOLD OUT' }}
                </span>
              </div>
              <h3 class="font-bold text-sm leading-tight text-zinc-900 line-clamp-2">
                {{ item.name }}
              </h3>
            </div>

            <div class="mt-3 pt-2 border-t border-dashed border-zinc-300 flex items-center justify-between">
              <span class="font-mono font-black text-sm text-black">
                {{ item.priceText }}
              </span>
              <span class="text-[10px] font-mono font-bold text-zinc-400">
                {{ item.hasMultipleVariants ? 'SPEC ➔' : '+1' }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 結帳操作面板 -->
      <section class="lg:col-span-4 sticky bottom-2 lg:top-20 z-20">
        <div class="bg-white border-2 border-black p-4 shadow-[6px_6px_0px_#000] flex flex-col gap-3">
          
          <div class="flex items-center justify-between border-b border-black pb-2">
            <div class="flex items-center gap-2">
              <span class="font-mono font-black text-xs bg-black text-white px-1.5 py-0.5">CART</span>
              <span class="font-mono text-xs font-bold text-zinc-600">已選 {{ cartSummary.totalQty }} 件</span>
            </div>
            <button
              type="button"
              @click="isCartDrawerOpen = true"
              class="text-[10px] font-mono font-bold underline cursor-pointer"
            >
              展開明細 ➔
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 bg-zinc-50 border border-black p-2.5">
            <div>
              <div class="text-[10px] font-mono font-bold text-zinc-500 uppercase">總計 TOTAL</div>
              <div class="font-mono font-black text-2xl text-black leading-tight">
                ${{ cartSummary.totalAmount }}
              </div>
            </div>
            <div class="text-right border-l border-dashed border-zinc-300 pl-2">
              <div class="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                應找 CHANGE (實收 ${{ receivedAmount }})
              </div>
              <div class="font-mono font-black text-2xl text-emerald-600 leading-tight">
                ${{ changeAmount }}
              </div>
            </div>
          </div>

          <!-- 面額按鈕 -->
          <div class="space-y-1.5 pt-1">
            <div class="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                @click="addCash(100)"
                class="py-2.5 bg-zinc-100 hover:bg-zinc-200 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-black text-sm shadow-[2px_2px_0px_#000] active:shadow-none transition-all cursor-pointer"
              >
                +100
              </button>
              <button
                type="button"
                @click="addCash(500)"
                class="py-2.5 bg-zinc-100 hover:bg-zinc-200 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-black text-sm shadow-[2px_2px_0px_#000] active:shadow-none transition-all cursor-pointer"
              >
                +500
              </button>
              <button
                type="button"
                @click="addCash(1000)"
                class="py-2.5 bg-zinc-100 hover:bg-zinc-200 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-black text-sm shadow-[2px_2px_0px_#000] active:shadow-none transition-all cursor-pointer"
              >
                +1000
              </button>
            </div>

            <div class="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                @click="addCash(10)"
                class="py-2 bg-zinc-50 hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-bold text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition-all cursor-pointer"
              >
                +10
              </button>
              <button
                type="button"
                @click="addCash(50)"
                class="py-2 bg-zinc-50 hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-bold text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition-all cursor-pointer"
              >
                +50
              </button>
              <button
                type="button"
                @click="setExact"
                class="py-2 bg-amber-200 hover:bg-amber-300 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-bold text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition-all cursor-pointer"
              >
                EXACT
              </button>
              <button
                type="button"
                @click="clearCash"
                class="py-2 bg-zinc-200 hover:bg-zinc-300 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono font-bold text-xs shadow-[2px_2px_0px_#000] active:shadow-none transition-all cursor-pointer"
              >
                CLR
              </button>
            </div>
          </div>

          <button
            type="button"
            :disabled="cartItems.length === 0"
            @click="isCartCheckOpen = true"
            class="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-black text-white text-base tracking-wider shadow-[3px_3px_0px_#000] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            <span>完成結帳</span>
            <span class="font-mono text-lg">➔</span>
          </button>
        </div>
      </section>

    </main>


    <!-- 掛載統計明細 -->
    <EventSalesModal
      :is-open="isSalesModalOpen"
      :event="activeEvent"
      @close="isSalesModalOpen = false"
    />

    <!-- 多規格選擇彈窗 -->
    <VariantModal
      :is-open="isModalOpen"
      :product-name="selectedProduct?.name ?? ''"
      :variants="modalVariants"
      @close="isModalOpen = false"
      @select="handleSelectVariantFromModal"
    />

    <!-- 購物車抽屜 -->
    <CartDrawer
      :is-open="isCartDrawerOpen"
      :items="cartItems"
      :total-amount="cartSummary.totalAmount"
      @close="isCartDrawerOpen = false"
      @update-qty="handleUpdateQty"
      @remove-item="handleRemoveItem"
      @clear-cart="handleClearCart"
    />

    <!-- 重設購物車確認 -->
    <ConfirmModal
      :is-open="showResetConfirm"
      title="確定要重設當前購物車嗎？"
      message="這將會清空目前已點選的所有品項與實收金額。"
      tag="RESET CART"
      type="danger"
      confirm-text="清空整單"
      cancel-text="保留"
      @confirm="() => { handleClearCart(); showResetConfirm = false }"
      @cancel="showResetConfirm = false"
    />

    <!-- 庫存不足警告 -->
    <ConfirmModal
      :is-open="showNoStockAlert"
      title="現場配額已達上限"
      message="該品項在本次場次的配額已全數加入購物車或已售罄。"
      tag="OUT OF STOCK"
      type="warning"
      alert-only
      confirm-text="了解"
      @confirm="showNoStockAlert = false"
      @cancel="showNoStockAlert = false"
    />

    <ConfirmModal
      :is-open="isCartCheckOpen"
      title="確認完成這筆結帳？"
      message="完成結帳將無法進行訂單修改"
      tag="CONFIRM"
      type="warning"
      confirm-text="確定結帳"
      cancel-text="回到購物車"
      @confirm="handleCheckout()"
      @cancel="isCartCheckOpen = false"
    />

    <!-- 結帳成功提示 -->
    <ConfirmModal
      :is-open="showCheckoutSuccess"
      title="結帳完成！"
      :message="`本次交易總計 $${lastCheckoutSummary.total}，找零 $${lastCheckoutSummary.change}。庫存已即時扣減。`"
      tag="SUCCESS"
      type="warning"
      alert-only
      confirm-text="下一筆 ➔"
      @confirm="showCheckoutSuccess = false"
      @cancel="showCheckoutSuccess = false"
    />
  </div>
</template>