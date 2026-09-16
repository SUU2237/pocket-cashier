import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const ESTIMATED_MAX_BYTES = 5 * 1024 * 1024 // 5MB

export const useStorageStore = defineStore('storage', () => {
  const usedBytes = ref(0)
  const isStorageError = ref(false)

  const calculateUsage = () => {
    let total = 0
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const val = localStorage.getItem(key) || ''
          total += (key.length + val.length) * 2
        }
      }
      usedBytes.value = total
    } catch {
      // 忽略防禦例外
    }
  }

  const usagePercentage = computed(() => {
    const pct = Math.round((usedBytes.value / ESTIMATED_MAX_BYTES) * 100)
    return Math.min(pct, 100)
  })

  const formattedUsed = computed(() => {
    return (usedBytes.value / (1024 * 1024)).toFixed(2) + ' MB'
  })

  const isNearFull = computed(() => usagePercentage.value >= 80)

  const triggerStorageError = () => {
    isStorageError.value = true
    calculateUsage()
  }

  const dismissError = () => {
    isStorageError.value = false
  }

  return {
    usedBytes,
    usagePercentage,
    formattedUsed,
    isNearFull,
    isStorageError,
    calculateUsage,
    triggerStorageError,
    dismissError,
  }
})