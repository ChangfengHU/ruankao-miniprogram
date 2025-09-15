import httpClient from './api'

// 题目相关接口类型
export interface Question {
  id: string
  content: string
  options: string[]
  correctAnswer: string
  explanation?: string
  difficulty: 1 | 2 | 3 | 4 | 5
  subject: string
  category: string
  knowledgePoints: string[]
  year?: number
  usage_count?: number
  correct_rate?: number
}

export interface QuestionFilters {
  difficulty?: number[]
  subjects?: string[]
  categories?: string[]
  knowledgePoints?: string[]
  years?: number[]
  limit?: number
  offset?: number
}

export interface RecommendationRequest {
  user_id?: string
  num_questions?: number
  filters?: QuestionFilters
  exclude_answered?: boolean
  prioritize_weak_points?: boolean
}

export interface QuestionRecommendation {
  question_id: string
  question: Question
  score: number
  reason: string
  confidence: number
  recommendation_type: string
}

export interface AnswerSubmission {
  question_id: string
  user_answer: string
  response_time: number
  difficulty_rating?: number
}

export interface AnswerResponse {
  is_correct: boolean
  explanation: string
  knowledge_points: string[]
  related_questions?: string[]
}

// 题目服务类
class QuestionService {

  /**
   * 获取推荐题目
   */
  async getRecommendedQuestions(params: RecommendationRequest = {}): Promise<QuestionRecommendation[]> {
    try {
      const response = await httpClient.post<QuestionRecommendation[]>('/recommendations/questions', params)
      
      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message || '获取推荐题目失败')
      }
    } catch (error) {
      console.error('获取推荐题目失败:', error)
      // 返回空数组而不是抛出错误，让应用继续运行
      return []
    }
  }

  /**
   * 根据条件搜索题目
   */
  async searchQuestions(filters: QuestionFilters): Promise<Question[]> {
    try {
      const response = await httpClient.get<Question[]>('/questions/search', filters)
      
      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message || '搜索题目失败')
      }
    } catch (error) {
      console.error('搜索题目失败:', error)
      return []
    }
  }

  /**
   * 获取单个题目详情
   */
  async getQuestionDetail(questionId: string): Promise<Question | null> {
    try {
      const response = await httpClient.get<Question>(`/questions/${questionId}`)
      
      if (response.success && response.data) {
        return response.data
      } else {
        return null
      }
    } catch (error) {
      console.error('获取题目详情失败:', error)
      return null
    }
  }

  /**
   * 提交答案
   */
  async submitAnswer(submission: AnswerSubmission): Promise<AnswerResponse | null> {
    try {
      const response = await httpClient.post<AnswerResponse>('/questions/submit-answer', submission)
      
      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message || '提交答案失败')
      }
    } catch (error) {
      console.error('提交答案失败:', error)
      return null
    }
  }

  /**
   * 获取用户答题历史
   */
  async getAnswerHistory(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const response = await httpClient.get('/questions/answer-history', { limit, offset })
      
      if (response.success && response.data) {
        return response.data
      } else {
        return []
      }
    } catch (error) {
      console.error('获取答题历史失败:', error)
      return []
    }
  }

  /**
   * 获取错题本
   */
  async getWrongQuestions(limit: number = 50, offset: number = 0): Promise<Question[]> {
    try {
      const response = await httpClient.get<Question[]>('/questions/wrong-questions', { limit, offset })
      
      if (response.success && response.data) {
        return response.data
      } else {
        return []
      }
    } catch (error) {
      console.error('获取错题本失败:', error)
      return []
    }
  }

  /**
   * 标记题目为已掌握
   */
  async markQuestionAsMastered(questionId: string): Promise<boolean> {
    try {
      const response = await httpClient.post(`/questions/${questionId}/mark-mastered`)
      return response.success
    } catch (error) {
      console.error('标记题目失败:', error)
      return false
    }
  }

  /**
   * 获取题目统计信息
   */
  async getQuestionStats(): Promise<any> {
    try {
      const response = await httpClient.get('/questions/stats')
      
      if (response.success && response.data) {
        return response.data
      } else {
        return {
          total_questions: 0,
          answered_questions: 0,
          correct_answers: 0,
          accuracy_rate: 0,
          average_response_time: 0
        }
      }
    } catch (error) {
      console.error('获取题目统计失败:', error)
      return {
        total_questions: 0,
        answered_questions: 0,
        correct_answers: 0,
        accuracy_rate: 0,
        average_response_time: 0
      }
    }
  }

  /**
   * 获取知识点列表
   */
  async getKnowledgePoints(): Promise<string[]> {
    try {
      const response = await httpClient.get<string[]>('/questions/knowledge-points')
      
      if (response.success && response.data) {
        return response.data
      } else {
        return []
      }
    } catch (error) {
      console.error('获取知识点失败:', error)
      return []
    }
  }

  /**
   * 获取用户知识点掌握度
   */
  async getKnowledgeMastery(): Promise<Record<string, number>> {
    try {
      const response = await httpClient.get<Record<string, number>>('/questions/knowledge-mastery')
      
      if (response.success && response.data) {
        return response.data
      } else {
        return {}
      }
    } catch (error) {
      console.error('获取知识点掌握度失败:', error)
      return {}
    }
  }

  /**
   * 反馈题目推荐结果
   */
  async feedbackRecommendation(questionId: string, feedback: 'helpful' | 'not_helpful', rating?: number): Promise<boolean> {
    try {
      const response = await httpClient.post('/recommendations/feedback', {
        question_id: questionId,
        feedback,
        rating
      })
      return response.success
    } catch (error) {
      console.error('提交推荐反馈失败:', error)
      return false
    }
  }
}

// 创建题目服务实例
const questionService = new QuestionService()

// 导出题目服务
export default questionService