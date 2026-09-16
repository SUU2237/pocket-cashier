import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import CashierView from '@/views/CashierView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/cashier',
      name: 'cashier',
      component: CashierView,
    },
    {
      path: '/events',
      name: 'events',
      // 先用簡易元件佔位，待實作完整管理頁面
      component: () => import('@/views/EventManageView.vue'),
    },
    {
      path: '/inventory',
      name: 'inventory',
      // 先用簡易元件佔位，待實作完整庫存頁面
      component: () => import('@/views/ProductLibraryView.vue'),
    },
  ],
})

export default router