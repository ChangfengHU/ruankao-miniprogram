import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 用户状态管理
export const useUserStore = create()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      
      // Actions
      setUser: (user) => {
        set({ user, isLoggedIn: true })
      },
      
      updateUser: (updates) => {
        const { user } = get()
        if (!user) return
        
        set({
          user: { ...user, ...updates }
        })
      },
      
      clearUser: () => {
        set({
          user: null,
          isLoggedIn: false
        })
      },
      
      login: (userInfo) => {
        set({
          user: userInfo,
          isLoggedIn: true
        })
      },
      
      logout: () => {
        set({
          user: null,
          isLoggedIn: false
        })
      }
    }),
    {
      name: 'user-storage'
    }
  )
)