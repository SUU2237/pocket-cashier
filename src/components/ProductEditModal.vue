<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

export interface VariantItem {
  id: string
  name: string
  price: number | ''
  stock: number | ''
}

export interface ProductFormData {
  id?: string
  name: string
  category: string
  imageUrl?: string
  variants: VariantItem[]
}

const props = defineProps<{
  isOpen: boolean
  initialData?: ProductFormData | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: ProductFormData): void
}>()

const form = reactive<ProductFormData>({
  name: '',
  category: '',
  imageUrl:'',
  variants: [],
})

let originalSnapshot = ''

// Modal 控制狀態
const showConfirmDiscard = ref(false)
const showAlertNameRequired = ref(false)

const resetDraftFromProps = () => {
  if (props.initialData) {
    form.id = props.initialData.id
    form.name = props.initialData.name
    form.category = props.initialData.category || ''
    form.imageUrl = props.initialData?.imageUrl || ''
    form.variants = props.initialData.variants.map(v => ({ ...v }))
  } else {
    form.id = undefined
    form.name = ''
    form.category = ''
    form.imageUrl = ''
    form.variants = [
      { id: `var_${Date.now()}`, name: '', price: '', stock: '' },
    ]
  }
  originalSnapshot = JSON.stringify(form)
  showConfirmDiscard.value = false
  showAlertNameRequired.value = false
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) resetDraftFromProps()
  },
  { immediate: true },
)

const addVariant = () => {
  form.variants.push({
    id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: '',
    price: '',
    stock: '',
  })
}

const removeVariant = (index: number) => {
  if (form.variants.length > 1) {
    form.variants.splice(index, 1)
  }
}

const checkIsDirty = () => {
  return JSON.stringify(form) !== originalSnapshot
}

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

// 判斷是否為無效數字（空值、NaN、或小於 0）
const isInvalidNum = (val: unknown) => {
  if (val === '' || val === null || val === undefined) return true
  const n = Number(val)
  return isNaN(n) || n < 0
}

// 表單內是否有任何規格數值違規
const hasVariantError = computed(() => {
  return form.variants.some(v => isInvalidNum(v.price) || isInvalidNum(v.stock))
})

const handleSave = () => {
  if (!form.name.trim()) {
    showAlertNameRequired.value = true
    return
  }

  const cleanVariants = form.variants.map((v, index) => {
    let finalName = v.name.trim()
    if (!finalName) {
      finalName = form.variants.length === 1 ? '單一規格' : `規格 ${index + 1}`
    }

    return {
      ...v,
      name: finalName,
      price: v.price === '' ? 0 : Math.max(0, Number(v.price)),
      stock: v.stock === '' ? 0 : Math.max(0, Number(v.stock)),
    }
  })

  emit('save', {
    ...form,
    name: form.name.trim(),
    category: form.category.trim() || '未分類',
    imageUrl: form.imageUrl || '',
    variants: cleanVariants,
  })
  emit('close')
}

// 壓縮圖片為輕量 Base64，避免塞爆 LocalStorage
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 230 // POS 機小圖只需 230px
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width)
            width = MAX_SIZE
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height)
            height = MAX_SIZE
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if(ctx){
          ctx.fillStyle = '#f4f4f5'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)
        }
        
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    try {
      const base64 = await compressImage(target.files[0])
      form.imageUrl = base64
    } catch (err) {
      console.error('圖片處理失敗', err)
    }
  }
}

const removeImage = () => {
  form.imageUrl = ''
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    @click.self="requestClose"
  >
    <div class="bg-white border-2 border-black w-full max-w-lg shadow-[6px_6px_0px_#000] p-5 flex flex-col max-h-[90vh]">
      
      <!-- 頂部標題 -->
      <div class="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-black bg-black text-white px-1.5 py-0.5">
            {{ form.id ? 'EDIT ITEM' : 'NEW ITEM' }}
          </span>
          <h2 class="text-base font-black text-zinc-900">
            {{ form.id ? '編輯商品資料' : '新增商品品項' }}
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

      <!-- 表單內容 -->
      <div class="flex-1 overflow-y-auto space-y-4 pr-1">
        <div class="space-y-4">
        <div>
          <label class="block text-xs font-mono font-bold mb-2">商品圖片</label>
          <div class="flex items-center gap-4 p-3 bg-zinc-50 border-2 border-black">
            <!-- 方形圖片預覽 -->
            <div class="w-16 h-16 border-2 border-black bg-white shrink-0 relative flex items-center justify-center overflow-hidden">
              <img
                v-if="form.imageUrl"
                :src="form.imageUrl"
                alt="預覽"
                class="w-full h-full object-cover"
              />
              <span v-else class="font-mono text-[10px] text-zinc-400 font-bold">NO IMG</span>
              <button
                v-if="form.imageUrl"
                type="button"
                @click="removeImage"
                class="absolute top-0.5 right-0.5 bg-black text-white text-[9px] w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-red-600"
                title="移除圖片"
              >
                ✕
              </button>
            </div>

            <div class="flex-1 min-w-0">
              <label class="inline-block px-3 py-1.5 bg-white hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 border-2 border-black font-mono text-xs font-bold shadow-[2px_2px_0px_#000] active:shadow-none transition cursor-pointer">
                {{ form.imageUrl ? '更換圖片' : '選擇圖片上傳' }}
                <input
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  @change="handleFileChange"
                />
              </label>
              <p class="text-[11px] font-mono text-zinc-500 mt-1.5">
                支援 JPG / PNG，系統將自動等比壓縮
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-mono font-bold mb-1">作品分類 / IP</label>
            <input
              v-model="form.category"
              type="text"
              placeholder="例：原創"
              class="w-full px-3 py-2 border-2 border-black font-mono text-xs bg-white focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-mono font-bold mb-1">商品名稱 *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="請輸入商品名稱"
              class="w-full px-3 py-2 border-2 border-black font-mono text-xs bg-white focus:outline-none"
            />
          </div>
        </div>

      
        <div>
          <div class="flex items-center justify-between mb-2">
            <div>
              <label class="text-xs font-mono font-black text-zinc-700 uppercase">
                規格 / 售價 / 庫存
              </label>
              <span class="text-[10px] font-mono text-zinc-400 block">留空將自動預設為單一規格與 $0</span>
            </div>
            <button
              type="button"
              @click="addVariant"
              class="text-[10px] font-mono font-bold bg-zinc-100 border border-black px-2 py-0.5 hover:bg-black hover:text-white transition cursor-pointer"
            >
              + 增加規格
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="(v, index) in form.variants"
              :key="v.id"
              class="p-2.5 bg-zinc-50 border-2 border-black grid grid-cols-12 gap-2 items-center"
            >
              <div class="col-span-5">
                <span class="text-[9px] font-mono text-zinc-400 block mb-0.5">規格名稱</span>
                <input
                  v-model="v.name"
                  type="text"
                  placeholder="單一規格"
                  class="w-full border-2 border-black px-2 py-1 text-xs font-bold bg-white focus:outline-none"
                />
              </div>

              <div class="col-span-3">
                <span class="text-[9px] font-mono text-zinc-400 block mb-0.5">售價 ($)</span>
                <input
                  v-model.number="v.price"
                  type="number"
                  min="0"
                  placeholder="0"
                  :class="[
                    'w-full border-2 px-2 py-1 text-xs font-mono font-bold bg-white text-right focus:outline-none transition-colors',
                    isInvalidNum(v.price) ?  'border-red-500 text-red-600 bg-red-50' : 'border-black'
                  ]"
                />
              </div>

              <div class="col-span-3">
                <span class="text-[9px] font-mono text-zinc-400 block mb-0.5">庫存</span>
                <input
                  v-model.number="v.stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  :class="[
                    'w-full border-2 px-2 py-1 text-xs font-mono font-bold bg-white text-right focus:outline-none transition-colors',
                    isInvalidNum(v.stock) ?  'border-red-500 text-red-600 bg-red-50' : 'border-black'
                  ]"/>
              </div>

              <div class="col-span-1 text-right pt-3">
                <button
                  type="button"
                  :disabled="form.variants.length <= 1"
                  @click="removeVariant(index)"
                  class="text-xs font-mono font-black text-zinc-400 hover:text-red-600 disabled:opacity-20 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- 底部操作按鈕 -->
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
          :disabled="hasVariantError"
          @click="handleSave"
          :class="[
            'py-2.5 border-2 border-black font-mono font-black text-white text-xs tracking-wider shadow-[2px_2px_0px_#000] transition ',
            hasVariantError
              ? 'bg-zinc-400 cursor-not-allowed opacity-60 shadow-none cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 active:shadow-none cursor-pointer'
          ]">
          SAVE ITEM ➔
        </button>
      </div>

    </div>

    <!-- 品名必填警告 -->
    <ConfirmModal
      :is-open="showAlertNameRequired"
      title="無法儲存商品"
      message="請填寫商品名稱後再進行儲存。"
      tag="REQUIRED"
      type="warning"
      alert-only
      confirm-text="了解"
      @confirm="showAlertNameRequired = false"
      @cancel="showAlertNameRequired = false"
    />

    <!-- 放棄編輯確認 -->
    <ConfirmModal
      :is-open="showConfirmDiscard"
      title="確定要放棄本次編輯嗎？"
      message="未儲存的修改將直接捨棄，商品將維持原本設定。"
      tag="UNSAVED CHANGES"
      type="danger"
      confirm-text="放棄變更"
      cancel-text="繼續編輯"
      @confirm="confirmDiscard"
      @cancel="showConfirmDiscard = false"
    />
  </div>
</template>