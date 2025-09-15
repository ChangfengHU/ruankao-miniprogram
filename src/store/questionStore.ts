import { create } from 'zustand'

export const useQuestionStore = create((set, get) => ({
  // 初始状态
  questions: [],
  currentIndex: 0,
  userAnswers: {},
  showAnswers: {},
  answerRecords: [],
  totalQuestions: 0,
  correctCount: 0,
  currentStreak: 0,
  loading: false,
  error: null,

  // Actions
  setQuestions: (questions) => {
    set({
      questions,
      totalQuestions: questions.length,
      currentIndex: 0,
      userAnswers: {},
      showAnswers: {},
      correctCount: 0,
      currentStreak: 0
    })
  },

  setCurrentIndex: (index) => {
    const { questions } = get()
    if (index >= 0 && index < questions.length) {
      set({ currentIndex: index })
    }
  },

  addUserAnswer: (questionId, answer, responseTime) => {
    const { userAnswers, answerRecords, questions, correctCount, currentStreak } = get()
    
    // 找到对应的题目
    const question = questions.find(q => q.id === questionId)
    if (!question) return
    
    const isCorrect = answer === question.correctAnswer
    
    // 创建答题记录
    const answerRecord = {
      questionId,
      userAnswer: answer,
      isCorrect,
      responseTime,
      timestamp: Date.now()
    }
    
    set({
      userAnswers: {
        ...userAnswers,
        [questionId]: answer
      },
      answerRecords: [...answerRecords, answerRecord],
      correctCount: isCorrect ? correctCount + 1 : correctCount,
      currentStreak: isCorrect ? currentStreak + 1 : 0
    })
  },

  showAnswer: (questionId) => {
    const { showAnswers } = get()
    set({
      showAnswers: {
        ...showAnswers,
        [questionId]: true
      }
    })
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get()
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 })
    }
  },

  previousQuestion: () => {
    const { currentIndex } = get()
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 })
    }
  },

  resetSession: () => {
    set({
      currentIndex: 0,
      userAnswers: {},
      showAnswers: {},
      answerRecords: [],
      correctCount: 0,
      currentStreak: 0,
      error: null
    })
  },

  setLoading: (loading) => {
    set({ loading })
  },

  setError: (error) => {
    set({ error })
  },

  // Computed getters
  getCurrentQuestion: () => {
    const { questions, currentIndex } = get()
    return questions[currentIndex] || null
  },

  getProgress: () => {
    const { currentIndex, questions } = get()
    if (questions.length === 0) return 0
    return (currentIndex + 1) / questions.length
  },

  getAccuracy: () => {
    const { correctCount, answerRecords } = get()
    if (answerRecords.length === 0) return 0
    return correctCount / answerRecords.length
  }
}))