// 模拟数据服务 - AI多轮对话和推荐系统

// 题目模拟数据 (格式统一)
const MOCK_QUESTIONS = [
  {
    id: "q_001",
    content: "在UML类图中，下列哪种关系表示\"has-a\"关系？",
    options: [
      "A. 继承关系(Inheritance)",
      "B. 实现关系(Realization)", 
      "C. 组合关系(Composition)",
      "D. 依赖关系(Dependency)"
    ],
    correctAnswer: "C",
    explanation: "组合关系表示整体与部分的关系，即'has-a'关系。组合是一种强聚合关系，表示整体拥有部分，部分不能脱离整体单独存在。",
    difficulty: 3,
    subject: "软件工程",
    category: "UML建模",
    knowledgePoints: ["UML类图", "关系类型", "面向对象设计"],
    year: 2023,
    usage_count: 1250,
    correct_rate: 0.68
  },
  {
    id: "q_002", 
    content: "关系数据库中，用于保证数据完整性的约束不包括？",
    options: [
      "A. 主键约束(Primary Key)",
      "B. 外键约束(Foreign Key)",
      "C. 检查约束(Check)",
      "D. 索引约束(Index)"
    ],
    correctAnswer: "D",
    explanation: "索引约束不是数据完整性约束。索引是为了提高查询效率而创建的数据结构，不用于保证数据完整性。数据完整性约束包括：主键约束、外键约束、检查约束、唯一约束等。",
    difficulty: 2,
    subject: "数据库系统",
    category: "数据库设计",
    knowledgePoints: ["数据完整性", "约束类型", "关系数据库"],
    year: 2023,
    usage_count: 980,
    correct_rate: 0.75
  },
  {
    id: "q_003",
    content: "TCP协议采用什么机制来保证可靠传输？",
    options: [
      "A. 滑动窗口和确认应答",
      "B. 路由选择和拥塞控制", 
      "C. 数据加密和身份验证",
      "D. 负载均衡和故障转移"
    ],
    correctAnswer: "A",
    explanation: "TCP使用滑动窗口机制控制发送速率，使用确认应答(ACK)机制确保数据包被正确接收。这两个机制配合超时重传、序号机制等，共同保证TCP的可靠传输。",
    difficulty: 3,
    subject: "计算机网络",
    category: "传输层协议",
    knowledgePoints: ["TCP协议", "可靠传输", "滑动窗口"],
    year: 2024,
    usage_count: 1580,
    correct_rate: 0.62
  },
  {
    id: "q_004",
    content: "下列排序算法中，时间复杂度为O(n log n)且稳定的是？",
    options: [
      "A. 快速排序",
      "B. 堆排序", 
      "C. 归并排序",
      "D. 选择排序"
    ],
    correctAnswer: "C",
    explanation: "归并排序的时间复杂度始终为O(n log n)，且是稳定的排序算法。快速排序平均时间复杂度为O(n log n)但不稳定，堆排序时间复杂度为O(n log n)但不稳定。",
    difficulty: 3,
    subject: "数据结构与算法",
    category: "排序算法",
    knowledgePoints: ["排序算法", "时间复杂度", "算法稳定性"],
    year: 2024,
    usage_count: 1420,
    correct_rate: 0.71
  },
  {
    id: "q_005",
    content: "在面向对象编程中，多态性的实现依赖于？",
    options: [
      "A. 继承和方法重载",
      "B. 继承和方法重写",
      "C. 封装和继承", 
      "D. 抽象和接口"
    ],
    correctAnswer: "B",
    explanation: "多态性主要通过继承和方法重写（覆盖）来实现。子类继承父类后，重写父类的方法，在运行时根据对象的实际类型调用相应的方法。",
    difficulty: 2,
    subject: "面向对象编程",
    category: "多态性",
    knowledgePoints: ["多态性", "继承", "方法重写"],
    year: 2024,
    usage_count: 890,
    correct_rate: 0.78
  }
]

// 用户数据模拟
const MOCK_USER_PROFILE = {
  id: 'user_001',
  openid: 'mock_openid_123456',
  nickname: '软考学习者',
  avatarUrl: 'https://img.icons8.com/fluency/96/user-male-circle.png',
  level: 3,
  experience: 1250,
  totalQuestions: 156,
  correctAnswers: 98,
  currentStreak: 5,
  longestStreak: 12,
  studyDays: 15,
  targetExam: '软件设计师',
  knowledgeMastery: {
    "UML建模": 0.75,
    "数据库设计": 0.68,
    "网络协议": 0.82,
    "操作系统": 0.71,
    "软件测试": 0.59,
    "设计模式": 0.64
  }
}

// AI推荐数据模拟
const MOCK_RECOMMENDATIONS = [
  {
    question_id: "q_001",
    question: MOCK_QUESTIONS[0],
    score: 0.92,
    reason: "基于你在UML知识点的薄弱表现，推荐此题加强练习",
    confidence: 0.85,
    recommendation_type: "knowledge_graph"
  },
  {
    question_id: "q_002",
    question: MOCK_QUESTIONS[1], 
    score: 0.88,
    reason: "相似用户在数据库约束方面常错，建议巩固",
    confidence: 0.78,
    recommendation_type: "collaborative"
  },
  {
    question_id: "q_003",
    question: MOCK_QUESTIONS[2],
    score: 0.79,
    reason: "TCP协议是网络部分的核心，建议掌握",
    confidence: 0.82,
    recommendation_type: "content_based"
  }
]

// 学习统计数据模拟
const MOCK_STUDY_STATS = {
  todayQuestions: 12,
  todayCorrect: 8,
  todayStudyTime: 45, // 分钟
  weeklyProgress: {
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    questions: [8, 12, 15, 10, 16, 14, 12],
    accuracy: [75, 67, 80, 90, 69, 86, 83]
  },
  knowledgePointProgress: [
    { name: '数据结构', mastery: 0.85, total: 45, correct: 38 },
    { name: '算法设计', mastery: 0.72, total: 32, correct: 23 },
    { name: '数据库原理', mastery: 0.68, total: 28, correct: 19 },
    { name: '网络协议', mastery: 0.91, total: 22, correct: 20 },
    { name: '软件工程', mastery: 0.76, total: 38, correct: 29 }
  ]
}

// 模拟数据服务类
class MockDataService {
  
  /**
   * 获取推荐题目
   */
  async getRecommendedQuestions(count = 5) {
    // 模拟网络延迟
    await this.delay(500)
    
    // 随机打乱题目顺序
    const shuffled = [...MOCK_QUESTIONS].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count).map(question => ({
      question_id: question.id,
      question,
      score: 0.7 + Math.random() * 0.3,
      reason: this.generateRandomReason(),
      confidence: 0.6 + Math.random() * 0.4,
      recommendation_type: this.getRandomRecommendationType()
    }))
  }

  /**
   * 获取用户资料
   */
  async getUserProfile() {
    await this.delay(300)
    return { ...MOCK_USER_PROFILE }
  }

  /**
   * 更新用户统计
   */
  async updateUserStats(questionId, isCorrect, responseTime) {
    await this.delay(200)
    
    // 模拟更新用户统计数据
    MOCK_USER_PROFILE.totalQuestions += 1
    if (isCorrect) {
      MOCK_USER_PROFILE.correctAnswers += 1
      MOCK_USER_PROFILE.currentStreak += 1
      MOCK_USER_PROFILE.longestStreak = Math.max(MOCK_USER_PROFILE.longestStreak, MOCK_USER_PROFILE.currentStreak)
    } else {
      MOCK_USER_PROFILE.currentStreak = 0
    }
    
    // 更新经验值
    MOCK_USER_PROFILE.experience += isCorrect ? 10 : 3
    
    console.log('用户统计已更新:', MOCK_USER_PROFILE)
  }

  /**
   * 获取学习统计
   */
  async getStudyStats() {
    await this.delay(400)
    return { ...MOCK_STUDY_STATS }
  }

  /**
   * 获取错题本
   */
  async getWrongQuestions() {
    await this.delay(300)
    
    // 返回一些错题示例
    return MOCK_QUESTIONS.filter((_, index) => index % 3 === 0)
  }

  /**
   * 获取知识点掌握度
   */
  async getKnowledgeMastery() {
    await this.delay(250)
    return { ...MOCK_USER_PROFILE.knowledgeMastery }
  }

  /**
   * 搜索题目
   */
  async searchQuestions(filters) {
    await this.delay(400)
    
    let filtered = [...MOCK_QUESTIONS]
    
    // 按难度过滤
    if (filters.difficulty && filters.difficulty.length > 0) {
      filtered = filtered.filter(q => filters.difficulty.includes(q.difficulty))
    }
    
    // 按科目过滤
    if (filters.subjects && filters.subjects.length > 0) {
      filtered = filtered.filter(q => filters.subjects.includes(q.subject))
    }
    
    // 按知识点过滤
    if (filters.knowledgePoints && filters.knowledgePoints.length > 0) {
      filtered = filtered.filter(q => 
        q.knowledgePoints.some(kp => filters.knowledgePoints.includes(kp))
      )
    }
    
    return filtered.slice(0, filters.limit || 20)
  }

  /**
   * 获取题目详情
   */
  async getQuestionDetail(questionId) {
    await this.delay(200)
    return MOCK_QUESTIONS.find(q => q.id === questionId) || null
  }

  /**
   * 提交答案反馈
   */
  async submitAnswerFeedback(questionId, feedback) {
    await this.delay(150)
    console.log(`题目 ${questionId} 反馈: ${feedback}`)
    return true
  }

  /**
   * 获取学习建议
   */
  async getStudyAdvice() {
    await this.delay(350)
    
    const advice = [
      "建议重点复习数据库设计部分，正确率有待提高",
      "网络协议掌握得不错，可以尝试更难的题目",
      "软件测试知识需要加强，建议多做相关练习",
      "保持每天学习的好习惯，持续进步！"
    ]
    
    return advice.sort(() => 0.5 - Math.random()).slice(0, 2)
  }

  /**
   * 生成随机推荐理由
   */
  generateRandomReason() {
    const reasons = [
      "基于你的学习历史，此题目有助于知识点巩固",
      "相似水平用户经常在此类题目上犯错",
      "该题目涉及重要考点，建议掌握",
      "根据知识图谱分析，此题与你的薄弱点相关",
      "历年考试频率较高，建议重点练习"
    ]
    return reasons[Math.floor(Math.random() * reasons.length)]
  }

  /**
   * 获取随机推荐类型
   */
  getRandomRecommendationType() {
    const types = ['collaborative', 'content_based', 'knowledge_graph', 'user_preference']
    return types[Math.floor(Math.random() * types.length)]
  }

  /**
   * 模拟延迟
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 创建模拟数据服务实例
const mockDataService = new MockDataService()

export default mockDataService

// 导出模拟数据
export {
  MOCK_QUESTIONS,
  MOCK_USER_PROFILE,
  MOCK_RECOMMENDATIONS,
  MOCK_STUDY_STATS
}