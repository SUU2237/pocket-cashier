import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useStorageStore } from './storage'


export interface VariantItem {
  id: string
  name: string
  price: number
  stock: number
}

export interface Product {
  id: string
  name: string
  category: string
  imageUrl?: string
  variants: VariantItem[]
}

const STORAGE_KEY = 'NEO_POS_PRODUCTS'


export const useProductStore = defineStore('products', () => {
  const strageStore = useStorageStore()
  const saved = localStorage.getItem(STORAGE_KEY)
  const products = ref<Product[]>(saved ? JSON.parse(saved) : [])

  watch(
    products,
    (val) => {
      try{
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
        strageStore.calculateUsage()
      }catch(err: any){
        if(err?.name === 'QuotaExceededError' || err?.code === 22){
          strageStore.triggerStorageError()
        }
      }
      
    },
    { deep: true },
  )

  const addProduct = (prod: Omit<Product, 'id'>) => {
    products.value.unshift({
      ...prod,
      id: `prod_${Date.now()}`,
    })
  }

  const updateProduct = (prod: Product) => {
    const idx = products.value.findIndex(p => p.id === prod.id)
    if (idx !== -1) {
      products.value[idx] = { ...prod }
    }
  }

  const deleteProduct = (id: string) => {
    products.value = products.value.filter(p => p.id !== id)
  }

  // 扣減指定規格的母庫存
  const deductStock = (variantId: string, qty: number) => {
    for (const p of products.value) {
      const v = p.variants.find(item => item.id === variantId)
      if (v) {
        v.stock = Math.max(0, Number(v.stock) - qty)
        break
      }
    }
  }

  // 刪除訂單回補母庫存
  const addStock = (variantId: string, qty: number) => {
    for (const product of products.value) {
      const targetVariant = product.variants.find(v => v.id === variantId)
      if (targetVariant) {
        targetVariant.stock += qty
        break
      }
    }
  }

  return {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    deductStock,
    addStock,
  }
})

