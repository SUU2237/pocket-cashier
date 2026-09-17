import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useProductStore } from './products'
import { useStorageStore } from './storage'

export interface EventStockItem {
  variantId: string
  productName: string
  variantName: string
  category: string
  price: number
  eventStock: number
  selected: boolean
}

export interface OrderItem {
  variantId: string
  productName: string
  variantName: string
  price: number
  qty: number
}

export interface OrderRecord {
  id: string
  eventId: string
  createdAt: string
  items: OrderItem[]
  totalAmount: number
  receivedAmount: number
  changeAmount: number
}

export interface MarketEvent {
  id: string
  name: string
  date: string
  booth: string
  isActive: boolean
  stockConfig: EventStockItem[]
  orders: OrderRecord[]
}

const STORAGE_KEY = 'NEO_POS_EVENTS'

export const useEventStore = defineStore('events', () => {
  const storageStore = useStorageStore()
  const saved = localStorage.getItem(STORAGE_KEY)
  const events = ref<MarketEvent[]>(saved ? JSON.parse(saved) : [])

  watch(
    events,
    (val) => {
      try{
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
        storageStore.calculateUsage()
      }catch(err: any){
        if(err?.name === 'QuotaExceededError' || err?.codr === 22){
          storageStore.triggerStorageError()
        }
      }
      
    },
    { deep: true },
  )

  const activeEvent = computed(() => events.value.find(e => e.isActive) || null)

  const sortedEvents = computed(() => {
    return [...events.value].sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0
      const timeB = new Date(b.date).getTime() || 0
      return timeB - timeA // 降序：時間戳記越大的排在前面
    })
  })

  const setActiveEvent = (id: string) => {
    events.value.forEach(e => {
      e.isActive = e.id === id
    })
  }

  const addEvent = (eventData: { name: string; date: string; booth: string }) => {
    const isFirst = events.value.length === 0
    events.value.unshift({
      ...eventData,
      id: `ev_${Date.now()}`,
      isActive: isFirst,
      stockConfig: [],
      orders: [],
    })
  }

  const updateEvent = (id: string, eventData: { name: string; date: string; booth: string }) => {
    const target = events.value.find(e => e.id === id)
    if (target) {
      target.name = eventData.name
      target.date = eventData.date
      target.booth = eventData.booth
    }
  }

  const deleteEvent = (id: string) => {
    events.value = events.value.filter(e => e.id !== id)
  }

  const updateStockConfig = (eventId: string, config: EventStockItem[]) => {
    const target = events.value.find(e => e.id === eventId)
    if (target) {
      target.stockConfig = config
    }
  }

  // 結帳扣庫存：同步扣除「現場配額」與「全域倉庫母庫存」
  const recordOrder = (order: Omit<OrderRecord, 'id' | 'createdAt'>) => {
    const target = events.value.find(e => e.id === order.eventId)
    if (!target) return

    const productStore = useProductStore()

    order.items.forEach(item => {
      // 1. 扣減本場次現場庫存
      const stockItem = target.stockConfig.find(s => s.variantId === item.variantId)
      if (stockItem) {
        stockItem.eventStock = Math.max(0, stockItem.eventStock - item.qty)
      }

      // 2. 扣減全域商品倉庫母庫存
      productStore.deductStock(item.variantId, item.qty)
    })

    // 3. 寫入訂單紀錄
    target.orders.unshift({
      ...order,
      id: `ord_${Date.now()}`,
      createdAt: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
    })
  }

  return {
    events,
    activeEvent,
    sortedEvents,
    setActiveEvent,
    addEvent,
    updateEvent,
    deleteEvent,
    updateStockConfig,
    recordOrder,
  }
})