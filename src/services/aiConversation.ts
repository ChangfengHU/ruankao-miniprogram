// AI多轮对话模拟数据和服务

// 模拟的AI回复模板
const AI_RESPONSES = {
  // 通用问候
  greeting: [
    "你好！我是你的AI学习助手，很高兴为你服务！有什么软考相关的问题可以问我～",
    "欢迎来到软考学习助手！我可以帮你解答题目、分析知识点、制定学习计划。",
    "Hi！我是专门为软考学习设计的AI助手，随时为你答疑解惑！"
  ],
  
  // 题目解析相关
  explanation: [
    "让我来详细解析这道题目。首先，我们需要理解题目的核心考点...",
    "这是一道很典型的题目，考查的是{knowledge_point}相关知识。",
    "从题目分析来看，这道题的解题关键在于...",
    "这道题属于{difficulty}难度，让我用简单的方式来解释..."
  ],
  
  // 知识点讲解
  knowledge: [
    "关于{knowledge_point}这个知识点，我来给你详细讲解一下...",
    "这个概念在软考中很重要，让我从基础开始解释...",
    "你问的这个知识点涉及到几个方面，我逐一为你分析..."
  ],
  
  // 学习建议
  advice: [
    "根据你的学习情况，我建议你重点关注以下几个方面...",
    "从你的答题记录来看，在{weak_area}方面还需要加强练习。",
    "你的学习进度很不错！建议接下来可以挑战一些难度更高的题目。"
  ],
  
  // 错误解释
  mistake: [
    "这道题答错了，让我来分析一下可能的原因...",
    "没关系，错题是学习的好机会！让我帮你分析为什么会选错...",
    "这个错误很常见，我来解释一下正确的思路..."
  ],
  
  // 鼓励话语
  encouragement: [
    "你的学习态度很认真，继续保持！",
    "答对了！看来你对这个知识点掌握得不错。",
    "进步很明显，再接再厉！",
    "这道难题都能答对，说明你的基础很扎实！"
  ]
}

// 模拟知识点数据
const KNOWLEDGE_POINTS = [
  "数据结构", "算法设计", "数据库原理", "网络协议", "操作系统",
  "软件工程", "系统分析", "数据流图", "E-R模型", "关系数据库",
  "TCP/IP协议", "OSI模型", "进程管理", "内存管理", "文件系统",
  "UML建模", "设计模式", "软件测试", "项目管理", "系统架构"
]

// AI对话服务类
class AIConversationService {
  conversationHistory = new Map()
  userContext = new Map()

  /**
   * 发送消息并获取AI回复
   */
  async sendMessage(sessionId, message, context) {
    // 模拟网络延迟
    await this.delay(800 + Math.random() * 1200)
    
    // 获取对话历史
    const history = this.conversationHistory.get(sessionId) || []
    
    // 分析消息意图
    const intent = this.analyzeIntent(message)
    
    // 生成AI回复
    const response = this.generateResponse(message, intent, context, history)
    
    // 更新对话历史
    history.push(
      { type: 'user', content: message, timestamp: Date.now() },
      { type: 'assistant', content: response.reply, timestamp: Date.now() }
    )
    this.conversationHistory.set(sessionId, history)
    
    return response
  }

  /**
   * 分析用户消息意图
   */
  analyzeIntent(message) {
    const msg = message.toLowerCase()
    
    if (msg.includes('你好') || msg.includes('hi') || msg.includes('hello')) {
      return 'greeting'
    }
    
    if (msg.includes('解释') || msg.includes('解析') || msg.includes('为什么')) {
      return 'explanation'
    }
    
    if (msg.includes('知识点') || msg.includes('概念') || msg.includes('原理')) {
      return 'knowledge'
    }
    
    if (msg.includes('建议') || msg.includes('怎么学') || msg.includes('计划')) {
      return 'advice'
    }
    
    if (msg.includes('错') || msg.includes('不对') || msg.includes('答案')) {
      return 'mistake'
    }
    
    return 'general'
  }

  /**
   * 生成AI回复
   */
  generateResponse(message, intent, context, history) {
    let responseTemplate
    let messageType = 'text'
    
    switch (intent) {
      case 'greeting':
        responseTemplate = AI_RESPONSES.greeting
        break
      case 'explanation':
        responseTemplate = AI_RESPONSES.explanation
        messageType = 'explanation'
        break
      case 'knowledge':
        responseTemplate = AI_RESPONSES.knowledge
        messageType = 'knowledge'
        break
      case 'advice':
        responseTemplate = AI_RESPONSES.advice
        break
      case 'mistake':
        responseTemplate = AI_RESPONSES.mistake
        messageType = 'explanation'
        break
      default:
        responseTemplate = this.generateContextualResponse(message, context, history)
    }
    
    // 随机选择回复模板
    let reply = responseTemplate[Math.floor(Math.random() * responseTemplate.length)]
    
    // 替换模板变量
    reply = this.replaceTemplateVariables(reply, context)
    
    // 生成相关建议
    const suggestions = this.generateSuggestions(intent, context)
    const relatedTopics = this.generateRelatedTopics(intent, context)
    
    return {
      reply,
      suggestions,
      relatedTopics,
      messageType
    }
  }

  /**
   * 生成上下文相关回复
   */
  generateContextualResponse(message, context, history) {
    // 如果有题目上下文
    if (context?.currentQuestion) {
      return [
        `关于这道${context.currentQuestion.subject}题目，我来为你详细分析...`,
        `这道题考查的是${context.currentQuestion.knowledgePoints?.[0] || '核心概念'}，让我解释一下...`,
        `从题目内容来看，解题的关键在于理解...`
      ]
    }
    
    // 如果是连续对话
    if (history.length > 0) {
      return [
        "根据我们刚才的讨论，我来进一步解释...",
        "补充一下刚才说的内容...",
        "让我从另一个角度来回答你的问题..."
      ]
    }
    
    // 通用回复
    return [
      "这是一个很好的问题！让我来为你解答...",
      "我理解你的疑问，让我详细说明一下...",
      "根据我的分析，这个问题可以这样理解..."
    ]
  }

  /**
   * 替换模板变量
   */
  replaceTemplateVariables(template, context) {
    let result = template
    
    // 替换知识点
    if (template.includes('{knowledge_point}')) {
      const knowledgePoint = context?.currentQuestion?.knowledgePoints?.[0] || 
                            KNOWLEDGE_POINTS[Math.floor(Math.random() * KNOWLEDGE_POINTS.length)]
      result = result.replace(/\{knowledge_point\}/g, knowledgePoint)
    }
    
    // 替换难度
    if (template.includes('{difficulty}')) {
      const difficultyMap = { 1: '入门', 2: '简单', 3: '中等', 4: '困难', 5: '专家' }
      const difficulty = context?.currentQuestion?.difficulty || 3
      result = result.replace(/\{difficulty\}/g, difficultyMap[difficulty])
    }
    
    // 替换薄弱领域
    if (template.includes('{weak_area}')) {
      const weakArea = context?.userWeakAreas?.[0] || '数据结构'
      result = result.replace(/\{weak_area\}/g, weakArea)
    }
    
    return result
  }

  /**
   * 生成建议
   */
  generateSuggestions(intent, context) {
    const suggestions = []
    
    if (intent === 'explanation' || intent === 'mistake') {
      suggestions.push('需要更详细的解释吗？')
      suggestions.push('想了解相关的其他题目吗？')
      suggestions.push('要看看这个知识点的总结吗？')
    } else if (intent === 'knowledge') {
      suggestions.push('想看实际应用例子吗？')
      suggestions.push('需要练习相关题目吗？')
      suggestions.push('要了解进阶内容吗？')
    } else if (intent === 'advice') {
      suggestions.push('制定详细学习计划')
      suggestions.push('推荐相关学习资源')
      suggestions.push('分析学习进度')
    }
    
    return suggestions
  }

  /**
   * 生成相关话题
   */
  generateRelatedTopics(intent, context) {
    const topics = []
    
    if (context?.currentQuestion?.knowledgePoints) {
      topics.push(...context.currentQuestion.knowledgePoints.slice(0, 3))
    } else {
      // 随机选择相关话题
      const randomTopics = KNOWLEDGE_POINTS
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
      topics.push(...randomTopics)
    }
    
    return topics
  }

  /**
   * 获取学习建议
   */
  async getStudyAdvice(userStats) {
    await this.delay(600)
    
    const accuracy = userStats?.accuracy || 0
    const totalQuestions = userStats?.totalQuestions || 0
    
    if (accuracy > 80) {
      return `你的正确率达到了${accuracy}%，表现很优秀！建议挑战更高难度的题目，或者开始复习易错知识点。`
    } else if (accuracy > 60) {
      return `目前正确率${accuracy}%，还有提升空间。建议重点复习错题，巩固基础知识点。`
    } else {
      return `正确率${accuracy}%需要加强。建议从基础题目开始，系统地学习每个知识点。`
    }
  }

  /**
   * 获取题目解析
   */
  async getQuestionExplanation(questionId, userAnswer, isCorrect) {
    await this.delay(1000)
    
    const explanations = isCorrect ? [
      "答对了！你对这个知识点掌握得很好。",
      "正确！你的解题思路很清晰。",
      "很棒！这道题的关键你都抓住了。"
    ] : [
      "这道题确实有一定难度，让我来详细解释正确的解题思路...",
      "不用担心，这个知识点比较容易混淆，我们一起分析一下...",
      "这是个很好的学习机会，让我帮你理清思路..."
    ]
    
    const explanation = explanations[Math.floor(Math.random() * explanations.length)]
    
    const keyPoints = KNOWLEDGE_POINTS.slice(0, 2 + Math.floor(Math.random() * 2))
    
    const tips = isCorrect ? 
      "继续保持这种解题思路，你会越来越厉害的！" :
      "记住这个解题方法，下次遇到类似题目就不会错了。"
    
    const relatedQuestions = [
      `question_${Math.floor(Math.random() * 1000)}`,
      `question_${Math.floor(Math.random() * 1000)}`,
      `question_${Math.floor(Math.random() * 1000)}`
    ]
    
    return {
      explanation: explanation + "\n\n" + this.generateDetailedExplanation(),
      keyPoints,
      tips,
      relatedQuestions
    }
  }

  /**
   * 生成详细解析
   */
  generateDetailedExplanation() {
    const explanationParts = [
      "解题步骤：",
      "1. 首先分析题目要求，明确考查的知识点",
      "2. 回忆相关的理论知识和公式",
      "3. 逐一排除干扰选项",
      "4. 选择最符合题意的答案",
      "",
      "知识点总结：",
      "这类题目经常出现在考试中，掌握了基本原理就不难解决。",
      "建议多做相关练习题来加深理解。"
    ]
    
    return explanationParts.join("\n")
  }

  /**
   * 清除会话
   */
  clearSession(sessionId) {
    this.conversationHistory.delete(sessionId)
    this.userContext.delete(sessionId)
  }

  /**
   * 获取会话历史
   */
  getSessionHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || []
  }

  /**
   * 模拟延迟
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 创建AI对话服务实例
const aiConversationService = new AIConversationService()

export default aiConversationService