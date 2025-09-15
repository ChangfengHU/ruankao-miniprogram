import { create } from 'zustand'

export const useAIStore = create((set, get) => ({
  // 初始状态
  conversations: {},
  currentSessionId: null,
  isTyping: false,
  recommendations: [],
  lastRecommendationTime: null,
  connected: false,
  loading: false,
  error: null,

  // 对话相关Actions
  startNewSession: () => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    set({
      currentSessionId: sessionId,
      conversations: {
        ...get().conversations,
        [sessionId]: []
      }
    })
    return sessionId
  },

  addMessage: (sessionId, message) => {
    const { conversations } = get()
    const sessionMessages = conversations[sessionId] || []
    
    const newMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    set({
      conversations: {
        ...conversations,
        [sessionId]: [...sessionMessages, newMessage]
      }
    })
  },

  setTyping: (isTyping) => {
    set({ isTyping })
  },

  clearConversation: (sessionId) => {
    const { conversations } = get()
    const newConversations = { ...conversations }
    delete newConversations[sessionId]
    
    set({
      conversations: newConversations,
      currentSessionId: get().currentSessionId === sessionId ? null : get().currentSessionId
    })
  },

  // 推荐相关Actions
  setRecommendations: (recommendations) => {
    set({
      recommendations,
      lastRecommendationTime: Date.now()
    })
  },

  clearRecommendations: () => {
    set({
      recommendations: [],
      lastRecommendationTime: null
    })
  },

  // 状态管理Actions
  setConnected: (connected) => {
    set({ connected })
  },

  setLoading: (loading) => {
    set({ loading })
  },

  setError: (error) => {
    set({ error })
  },

  // Getters
  getCurrentConversation: () => {
    const { conversations, currentSessionId } = get()
    if (!currentSessionId) return []
    return conversations[currentSessionId] || []
  },

  getRecommendationsByType: (type) => {
    const { recommendations } = get()
    return recommendations.filter(rec => rec.type === type)
  }
}))