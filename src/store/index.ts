import { useUserStore } from './userStore'
import { useQuestionStore } from './questionStore'  
import { useAIStore } from './aiStore'
import { create } from 'zustand'

// 统一导出新的store
export {
  useUserStore,
  useQuestionStore,
  useAIStore
}

// 保留原有的useAppStore以兼容现有代码
export const useAppStore = create((set, get) => ({
  // 初始状态
  currentQuestion: null,
  questionQueue: [],
  currentIndex: 0,
  isLoading: false,
  
  userProfile: {
    id: 'mock-user-001',
    nickname: '软考学霸',
    avatar: 'https://img.icons8.com/fluency/96/user-male-circle.png',
    level: '初级程序员',
    targetExam: '程序员考试',
    masteryMatrix: {},
    totalQuestions: 0,
    correctAnswers: 0,
    streak: 0,
    longestStreak: 0,
    studyDays: 1
  },
  
  answerHistory: [],
  streak: 0,
  sessionQuestions: 0,
  sessionCorrect: 0,
  showResult: false,
  lastAnswer: null,
  
  // 设置当前题目
  setCurrentQuestion: (question) => {
    set({ currentQuestion: question })
  },
  
  // 设置题目队列
  setQuestionQueue: (questions) => {
    set({ 
      questionQueue: questions,
      currentIndex: 0,
      currentQuestion: questions[0] || null
    })
  },
  
  // 下一题
  nextQuestion: () => {
    const { questionQueue, currentIndex } = get()
    const nextIndex = currentIndex + 1
    
    if (nextIndex < questionQueue.length) {
      set({
        currentIndex: nextIndex,
        currentQuestion: questionQueue[nextIndex],
        showResult: false,
        lastAnswer: null
      })
    } else {
      // 题目用完了，需要加载更多
      set({ 
        isLoading: true,
        showResult: false,
        lastAnswer: null 
      })
      // 这里会触发加载更多题目的逻辑
    }
  },
  
  // 提交答案
  submitAnswer: (answer, responseTime) => {
    const { currentQuestion, userProfile, streak } = get()
    
    if (!currentQuestion) return
    
    const isCorrect = answer === currentQuestion.correctAnswer
    const newAnswerRecord = {
      questionId: currentQuestion.id,
      userAnswer: answer,
      isCorrect,
      responseTime,
      answeredAt: new Date().toISOString(),
      question: currentQuestion  // 保存完整题目信息供错题本使用
    }
    
    // 更新答题记录
    const newAnswerHistory = [...get().answerHistory, newAnswerRecord]
    
    // 更新连击数
    const newStreak = isCorrect ? streak + 1 : 0
    
    // 更新用户统计
    const newTotalQuestions = userProfile.totalQuestions + 1
    const newCorrectAnswers = userProfile.correctAnswers + (isCorrect ? 1 : 0)
    const newLongestStreak = Math.max(userProfile.longestStreak, newStreak)
    
    // 更新知识点掌握度
    const newMasteryMatrix = { ...userProfile.masteryMatrix }
    currentQuestion.knowledgePoints.forEach(point => {
      const currentMastery = newMasteryMatrix[point] || 0.5
      const adjustment = isCorrect ? 0.1 : -0.05
      newMasteryMatrix[point] = Math.max(0, Math.min(1, currentMastery + adjustment))
    })
    
    set({
      answerHistory: newAnswerHistory,
      streak: newStreak,
      sessionQuestions: get().sessionQuestions + 1,
      sessionCorrect: get().sessionCorrect + (isCorrect ? 1 : 0),
      showResult: true,
      lastAnswer: {
        isCorrect,
        explanation: currentQuestion.explanation
      },
      userProfile: {
        ...userProfile,
        totalQuestions: newTotalQuestions,
        correctAnswers: newCorrectAnswers,
        streak: newStreak,
        longestStreak: newLongestStreak,
        masteryMatrix: newMasteryMatrix
      }
    })
  },
  
  // 重置会话
  resetSession: () => {
    set({
      sessionQuestions: 0,
      sessionCorrect: 0,
      showResult: false,
      lastAnswer: null,
      currentIndex: 0
    })
  },
  
  // 更新用户资料
  updateUserProfile: (updates) => {
    const { userProfile } = get()
    set({
      userProfile: {
        ...userProfile,
        ...updates
      }
    })
  },
  
  // 设置加载状态
  setLoading: (loading) => {
    set({ isLoading: loading })
  },
  
  // 获取错题列表
  getWrongQuestions: () => {
    try {
      const { answerHistory } = get()
      if (!answerHistory || !Array.isArray(answerHistory)) {
        return []
      }
      
      return answerHistory
        .filter(record => record && !record.isCorrect && record.question)
        .map(record => record.question)
        .filter((question, index, self) => 
          question && index === self.findIndex(q => q && q.id === question.id)
        ) // 去重
    } catch (error) {
      console.error('Error in getWrongQuestions:', error)
      return []
    }
  },
  
  // 获取错题统计
  getWrongQuestionStats: () => {
    try {
      const { answerHistory } = get()
      if (!answerHistory || !Array.isArray(answerHistory)) {
        return {
          totalWrong: 0,
          totalAnswered: 0,
          accuracy: 0,
          recentWrong: []
        }
      }
      
      const wrongAnswers = answerHistory.filter(record => record && !record.isCorrect)
      const totalQuestions = answerHistory.length
      const wrongCount = wrongAnswers.length
      const accuracy = totalQuestions > 0 ? ((totalQuestions - wrongCount) / totalQuestions) : 0
      
      return {
        totalWrong: wrongCount,
        totalAnswered: totalQuestions,
        accuracy: Math.round(accuracy * 100),
        recentWrong: wrongAnswers.slice(-10) // 最近10道错题
      }
    } catch (error) {
      console.error('Error in getWrongQuestionStats:', error)
      return {
        totalWrong: 0,
        totalAnswered: 0,
        accuracy: 0,
        recentWrong: []
      }
    }
  },
  
  // 清空错题本
  clearWrongAnswers: () => {
    const { answerHistory } = get()
    const correctAnswers = answerHistory.filter(record => record.isCorrect)
    set({ answerHistory: correctAnswers })
  },
  
  // 标记题目为已掌握（从错题本移除）
  markQuestionAsMastered: (questionId) => {
    const { answerHistory } = get()
    const updatedHistory = answerHistory.filter(record => 
      !(record.questionId === questionId && !record.isCorrect)
    )
    set({ answerHistory: updatedHistory })
  }
}))