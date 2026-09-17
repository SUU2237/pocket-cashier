export interface BackupData {
    version: string
    exportedAt: string
    products: unknown
    events: unknown
  }
  
  // 匯出 JSON 檔案
  export function exportBackupData(): void {
    const products = localStorage.getItem('NEO_POS_PRODUCTS')
    const events = localStorage.getItem('NEO_POS_EVENTS')
  
    const backupPayload: BackupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      products: products ? JSON.parse(products) : [],
      events: events ? JSON.parse(events) : [],
    }
  
    const jsonStr = JSON.stringify(backupPayload, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
  
    const dateStr = new Date().toISOString().slice(0, 10)
    const link = document.createElement('a')
    link.href = url
    link.download = `pocket-pos-backup-${dateStr}.json`
    link.click()
  
    URL.revokeObjectURL(url)
  }
  
  // 匯入 JSON 檔案並寫入 LocalStorage
  export function importBackupData(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const parsed = JSON.parse(content) as Partial<BackupData>
  
          if (!parsed.products || !parsed.events) {
            throw new Error('檔案格式不正確，缺少商品或活動資料')
          }
  
          // 寫入 LocalStorage
          localStorage.setItem('NEO_POS_PRODUCTS', JSON.stringify(parsed.products))
          localStorage.setItem('NEO_POS_EVENTS', JSON.stringify(parsed.events))
  
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('讀取檔案失敗'))
      reader.readAsText(file)
    })
  }