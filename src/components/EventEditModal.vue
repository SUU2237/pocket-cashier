<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

export interface EventFormData {
  id?: string
  name: string
  date: string
  booth: string
}

const props = defineProps<{
  isOpen: boolean
  initialData?: EventFormData | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: EventFormData): void
}>()

const form = reactive<EventFormData>({
  name: '',
  date: '',
  booth: '',
})

let originalSnapshot = ''
const showConfirmDiscard = ref(false)
const showAlertNameRequired = ref(false)

const resetDraft = () => {
  if (props.initialData) {
    form.id = props.initialData.id
    form.name = props.initialData.name
    form.date = props.initialData.date
    form.booth = props.initialData.booth
  } else {
    form.id = undefined
    form.name = ''
    form.date = new Date().toISOString().split('T')[0] ?? ''
    form.booth = ''
  }
  originalSnapshot = JSON.stringify(form)
  showConfirmDiscard.value = false
  showAlertNameRequired.value = false
}

watch(
  () => props.isOpen,
  (val) => {
    if (val) resetDraft()
  },
  { immediate: true },
)

const checkIsDirty = () => JSON.stringify(form) !== originalSnapshot

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

const handleSave = () => {
  if (!form.name.trim()) {
    showAlertNameRequired.value = true
    return
  }

  emit('save', {
    ...form,
    name: form.name.trim(),
    booth: form.booth.trim() || '未定',
  })
  emit('close')
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    @click.self="requestClose"
  >
    <div class="bg-white border-2 border-black w-full max-w-md shadow-[6px_6px_0px_#000] p-5 flex flex-col">
      <div class="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-black bg-black text-white px-1.5 py-0.5">
            {{ form.id ? 'EDIT EVENT' : 'NEW EVENT' }}
          </span>
          <h2 class="text-base font-black text-zinc-900">
            {{ form.id ? '編輯場次活動' : '建立新場次活動' }}
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

      <div class="space-y-3">
        <div>
          <label class="block text-xs font-mono font-black text-zinc-700 uppercase mb-1">
            場次活動名稱 *
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="例如：2026 寒假原創市集"
            class="w-full border-2 border-black p-2 text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-mono font-black text-zinc-700 uppercase mb-1">
              活動日期
            </label>
            <input
              v-model="form.date"
              type="date"
              class="w-full border-2 border-black p-2 text-xs font-mono font-bold bg-zinc-50 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-mono font-black text-zinc-700 uppercase mb-1">
              攤位號碼 / 位置
            </label>
            <input
              v-model="form.booth"
              type="text"
              placeholder="如：A03-A04"
              class="w-full border-2 border-black p-2 text-xs font-bold bg-zinc-50 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div class="pt-4 border-t-2 border-black mt-4 grid grid-cols-2 gap-3">
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
          SAVE EVENT ➔
        </button>
      </div>
    </div>

    <!-- 防呆：必填警告 -->
    <ConfirmModal
      :is-open="showAlertNameRequired"
      title="無法儲存活動"
      message="請輸入活動名稱後再進行儲存。"
      tag="REQUIRED"
      type="warning"
      alert-only
      confirm-text="了解"
      @confirm="showAlertNameRequired = false"
      @cancel="showAlertNameRequired = false"
    />

    <!-- 防呆：放棄確認 -->
    <ConfirmModal
      :is-open="showConfirmDiscard"
      title="確定要放棄本次編輯嗎？"
      message="未儲存的變更將直接捨棄。"
      tag="UNSAVED CHANGES"
      type="danger"
      confirm-text="放棄變更"
      cancel-text="繼續編輯"
      @confirm="confirmDiscard"
      @cancel="showConfirmDiscard = false"
    />
  </div>
</template>