import React, { useState, useEffect, useRef } from 'react'
import { View, Text, Button, Swiper, SwiperItem, Input } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'

// 导入新的store和服务
import { useQuestionStore, useUserStore, useAIStore } from '../../store'
import mockDataService from '../../services/mockData'
import aiConversationService from '../../services/aiConversation'

// 导入AI对话组件
import AIChat from '../../components/AIChat'

import './index.scss'

const Question = () => {
  // 使用新的状态管理 - 改为选择器模式
  const setQuestions = useQuestionStore(state => state.setQuestions)
  const getCurrentQuestion = useQuestionStore(state => state.getCurrentQuestion)
  const getProgress = useQuestionStore(state => state.getProgress)
  const getAccuracy = useQuestionStore(state => state.getAccuracy)
  const addUserAnswer = useQuestionStore(state => state.addUserAnswer)
  const showAnswer = useQuestionStore(state => state.showAnswer)
  const nextQuestion = useQuestionStore(state => state.nextQuestion)
  const resetSession = useQuestionStore(state => state.resetSession)
  const currentIndex = useQuestionStore(state => state.currentIndex)
  const questions = useQuestionStore(state => state.questions)
  const userAnswers = useQuestionStore(state => state.userAnswers)
  const showAnswers = useQuestionStore(state => state.showAnswers)
  const currentStreak = useQuestionStore(state => state.currentStreak)
  
  const updateUser = useUserStore(state => state.updateUser)
  const user = useUserStore(state => state.user)
  
  const startNewSession = useAIStore(state => state.startNewSession)
  const setTyping = useAIStore(state => state.setTyping)

  // 组件内部状态
  const [isLoading, setIsLoading] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0) // 改为X坐标
  const [touchEndX, setTouchEndX] = useState(0)     // 改为X坐标
  const [showAIChat, setShowAIChat] = useState(false) // AI对话弹窗
  const [aiConversations, setAiConversations] = useState({}) // 存储每个题目的AI解析

  const swiperRef = useRef(null)

  useLoad(() => {
    console.log('Question page loaded')
    initQuestions()
  })

  // 初始化题目数据
  const initQuestions = async () => {
    try {
      setIsLoading(true)
      
      // 从模拟服务获取推荐题目
      const recommendations = await mockDataService.getRecommendedQuestions(10)
      const questions = recommendations.map(rec => rec.question)
      
      // 更新题目store
      setQuestions(questions)
      
      // 记录开始时间
      setStartTime(Date.now())
      
      console.log('加载题目成功:', questions)
      
    } catch (error) {
      console.error('加载题目失败:', error)
      Taro.showToast({
        title: '加载题目失败',
        icon: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 选择答案
  const selectAnswer = async (answer) => {
    const currentQuestion = getCurrentQuestion()
    if (!currentQuestion || userAnswers[currentQuestion.id]) {
      return // 已经回答过了
    }

    const responseTime = Date.now() - startTime
    const isCorrect = answer === currentQuestion.correctAnswer

    // 更新答题记录
    addUserAnswer(currentQuestion.id, answer, responseTime)
    
    // 显示答案
    showAnswer(currentQuestion.id)

    // 生成AI解析
    await generateAIExplanation(currentQuestion, answer, isCorrect)

    // 更新用户统计
    try {
      await mockDataService.updateUserStats(currentQuestion.id, isCorrect, responseTime)
      
      // 更新用户store中的统计信息
      const currentUser = user
      if (currentUser) {
        updateUser({
          totalQuestions: (currentUser.totalQuestions || 0) + 1,
          correctAnswers: (currentUser.correctAnswers || 0) + (isCorrect ? 1 : 0)
        })
      }
    } catch (error) {
      console.error('更新用户统计失败:', error)
    }

    // 播放反馈音效
    if (isCorrect) {
      Taro.showToast({ title: '回答正确！', icon: 'success', duration: 1000 })
    } else {
      Taro.showToast({ title: '答错了', icon: 'error', duration: 1000 })
    }
  }

  // 生成AI解析
  const generateAIExplanation = async (question, userAnswer, isCorrect) => {
    try {
      // 创建初始AI分析消息
      const analysisMessage = {
        id: Date.now(),
        type: 'ai',
        content: `📚 **题目分析**

**正确答案：** ${question.correctAnswer}
**您的答案：** ${userAnswer} ${isCorrect ? '✅ 正确' : '❌ 错误'}

**💡 解析：**
${question.explanation}

**🎯 知识点：**
${question.knowledgePoints.map(point => `• ${point}`).join('\n')}

${isCorrect 
  ? '🎉 恭喜答对！这类题目的关键是理解核心概念。继续加油！' 
  : '💪 没关系，错题是最好的学习机会。让我们一起分析为什么这个答案是正确的。'
}

点击下方按钮与我进行更详细的讨论吧～`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      }
      
      // 存储到对话历史
      setAiConversations(prev => ({
        ...prev,
        [question.id]: [analysisMessage]
      }))
    } catch (error) {
      console.error('生成AI解析失败:', error)
      const errorMessage = {
        id: Date.now(),
        type: 'ai',
        content: '😅 AI解析生成失败，请稍后再试。不过您可以点击按钮与我讨论这道题！',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      }
      
      setAiConversations(prev => ({
        ...prev,
        [question.id]: [errorMessage]
      }))
    }
  }

  // 下一题
  const nextQuestionHandler = async () => {
    if (currentIndex < questions.length - 1) {
      nextQuestion()
      setStartTime(Date.now())
    } else {
      // 题目做完了，加载更多题目
      await loadMoreQuestions()
    }
  }

  // 加载更多题目
  const loadMoreQuestions = async () => {
    try {
      setIsLoading(true)
      
      // 获取新的推荐题目
      const recommendations = await mockDataService.getRecommendedQuestions(5)
      const newQuestions = recommendations.map(rec => rec.question)
      
      // 添加到现有题目列表
      const allQuestions = [...questions, ...newQuestions]
      setQuestions(allQuestions)
      nextQuestion()
      
      setStartTime(Date.now())
      
      console.log('加载更多题目成功')
      
    } catch (error) {
      console.error('加载更多题目失败:', error)
      
      // 显示完成页面
      showCompletionPage()
    } finally {
      setIsLoading(false)
    }
  }

  // 显示完成页面
  const showCompletionPage = () => {
    const correctCount = useQuestionStore.getState().correctCount
    const answerRecords = useQuestionStore.getState().answerRecords
    const accuracy = answerRecords.length > 0 ? (correctCount / answerRecords.length * 100) : 0
    
    Taro.showModal({
      title: '练习完成',
      content: `本轮练习结束！\n答对了 ${correctCount}/${answerRecords.length} 题\n正确率: ${accuracy.toFixed(1)}%`,
      confirmText: '继续练习',
      cancelText: '查看统计',
      success: (res) => {
        if (res.confirm) {
          // 重新开始
          resetSession()
          initQuestions()
        } else {
          // 跳转到统计页面
          Taro.switchTab({
            url: '/pages/profile/index'
          })
        }
      }
    })
  }

  // 处理触摸手势 - 左右滑动
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX) // 记录起始X坐标
  }

  const handleTouchMove = (e) => {
    setTouchEndX(e.touches[0].clientX) // 记录结束X坐标
  }

  const handleTouchEnd = () => {
    const currentQuestion = getCurrentQuestion()
    if (!currentQuestion || !showExplanation) {
      return // 只有回答后才能滑动到下一题
    }

    const deltaX = touchStartX - touchEndX
    const minSwipeDistance = 80 // 最小滑动距离，稍微大一点防止误触
    
    if (deltaX > minSwipeDistance) {
      // 向左滑动，切换到下一题
      nextQuestionHandler()
    } else if (deltaX < -minSwipeDistance) {
      // 向右滑动，回到上一题（如果需要的话）
      console.log('向右滑动，回到上一题')
      // 可以实现回到上一题的功能
    }
  }

  // 打开AI对话弹窗
  const openAIChat = () => {
    const currentQuestion = getCurrentQuestion()
    if (currentQuestion) {
      setShowAIChat(true)
    }
  }

  // 切换滑动模式 (目前暂未使用，但保留UI元素)
  const [useSwiper, setUseSwiper] = useState(false)
  const toggleSwipeMode = () => {
    setUseSwiper(!useSwiper)
  }

  // 辅助函数
  const getDifficultyColor = (difficulty) => {
    const colors = {
      1: '#2ECC71', // 入门
      2: '#3498DB', // 简单
      3: '#F39C12', // 中等
      4: '#E67E22', // 困难
      5: '#E74C3C'  // 专家
    }
    return colors[difficulty] || '#95A5A6'
  }

  const getDifficultyText = (difficulty) => {
    const texts = {
      1: '入门',
      2: '简单', 
      3: '中等',
      4: '困难',
      5: '专家'
    }
    return texts[difficulty] || '未知'
  }

  // 获取当前题目数据
  const currentQuestion = getCurrentQuestion()
  const progress = getProgress()
  const accuracy = getAccuracy()
  const isAnswered = currentQuestion ? !!userAnswers[currentQuestion.id] : false
  const userAnswer = currentQuestion ? userAnswers[currentQuestion.id] : null
  const showExplanation = currentQuestion ? !!showAnswers[currentQuestion.id] : false

  if (isLoading && !currentQuestion) {
    return (
      <View className='question-page loading'>
        <View className='loading-container'>
          <Text className='loading-text'>正在加载题目...</Text>
        </View>
      </View>
    )
  }

  if (!currentQuestion) {
    return (
      <View className='question-page error'>
        <View className='error-container'>
          <Text className='error-text'>暂无题目数据</Text>
          <Button className='retry-btn' onClick={initQuestions}>
            重新加载
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View 
      className='question-page'
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 顶部状态栏 */}
      <View className='status-bar safe-area-top'>
        <View className='status-content'>
          <View className='question-counter'>
            <Text className='counter-text'>
              {currentIndex + 1} / {questions.length}
            </Text>
          </View>
          
          <View className='stats-mini'>
            <View className='stat-item'>
              <Text className='stat-icon'>🎯</Text>
              <Text className='stat-text'>{Math.round(accuracy * 100)}%</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-icon'>🔥</Text>
              <Text className='stat-text'>{currentStreak}</Text>
            </View>
          </View>
          
          {/* 滑动模式切换 */}
          <View className='swipe-mode-toggle' onClick={toggleSwipeMode}>
            <Text className='mode-icon'>{useSwiper ? '📱' : '👆'}</Text>
          </View>
          
          <View className='progress-indicator'>
            <View 
              className='progress-fill'
              style={{ width: `${progress * 100}%` }}
            />
          </View>
        </View>
      </View>

      {/* 主要内容区域 */}
      <View className='main-content'>
        <View className='question-container'>
          {/* 题目卡片 */}
          <View className='question-card'>
            {/* 头部信息 */}
            <View className='question-header'>
              <View className='difficulty-badge' style={{ 
                backgroundColor: getDifficultyColor(currentQuestion.difficulty) 
              }}>
                <Text className='difficulty-text'>{getDifficultyText(currentQuestion.difficulty)}</Text>
              </View>
              
              <View className='category-info'>
                <Text className='subject-text'>{currentQuestion.subject}</Text>
                <Text className='category-text'>{currentQuestion.category}</Text>
              </View>
            </View>

            {/* 题目内容 */}
            <View className='question-content'>
              <Text className='question-text'>{currentQuestion.content}</Text>
            </View>

            {/* 选项列表 */}
            <View className='options-container'>
              {currentQuestion.options.map((option, optionIndex) => {
                const optionKey = option.charAt(0) // 'A', 'B', 'C', 'D'
                const optionText = option.substring(3) // 去掉 'A. '
                const isSelected = userAnswer === optionKey
                const isCorrect = optionKey === currentQuestion.correctAnswer
                const isWrongSelected = showExplanation && isSelected && !isCorrect
                
                return (
                  <View
                    key={optionKey}
                    className={`option-item ${isSelected ? 'selected' : ''} ${
                      showExplanation && isCorrect ? 'correct' : ''
                    } ${isWrongSelected ? 'wrong' : ''} ${showExplanation ? 'answered' : ''}`}
                    onClick={() => !isAnswered ? selectAnswer(optionKey) : null}
                    style={{ animationDelay: `${optionIndex * 0.1}s` }}
                  >
                    <View className='option-left'>
                      <View className='option-marker'>
                        <Text className='option-key'>{optionKey}</Text>
                      </View>
                      <Text className='option-text'>{optionText}</Text>
                    </View>
                    
                    <View className='option-indicator'>
                      {showExplanation && isCorrect && (
                        <View className='correct-icon'>✓</View>
                      )}
                      {isWrongSelected && (
                        <View className='wrong-icon'>✗</View>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>

            {/* 答案解析 */}
            {showExplanation && (
              <View className='answer-section animate-slide-up'>
                <View className='result-header'>
                  <Text className={`result-text ${
                    userAnswer === currentQuestion.correctAnswer ? 'correct' : 'wrong'
                  }`}>
                    {userAnswer === currentQuestion.correctAnswer ? '🎉 答对了!' : '💔 答错了'}
                  </Text>
                </View>
                
                <View className='explanation-section'>
                  <Text className='explanation-title'>💡 题目解析</Text>
                  <Text className='explanation-content'>{currentQuestion.explanation}</Text>
                </View>
                
                <View className='knowledge-points'>
                  {currentQuestion.knowledgePoints.map((point, pointIndex) => (
                    <View key={pointIndex} className='knowledge-tag'>
                      <Text className='tag-text'>{point}</Text>
                    </View>
                  ))}
                </View>
                
                {/* AI智能解析 */}
                <View className='ai-analysis-section'>
                  <Text className='ai-title'>🤖 AI智能解析</Text>
                  
                  {/* AI自动生成的解析 */}
                  <View className='ai-auto-analysis'>
                    {aiConversations[currentQuestion.id] && aiConversations[currentQuestion.id][0] ? (
                      <Text className='ai-analysis-content'>{aiConversations[currentQuestion.id][0].content}</Text>
                    ) : (
                      <View className='ai-loading'>
                        <Text className='loading-text'>AI正在分析中...</Text>
                      </View>
                    )}
                  </View>
                  
                  {/* AI多轮对话跳转按钮 */}
                  <View className='ai-actions'>
                    <Button
                      className='ai-chat-btn'
                      onClick={openAIChat}
                    >
                      💬 与AI深入讨论这道题
                    </Button>
                  </View>
                </View>

                {/* 滑动提示 */}
                <View className='swipe-hint'>
                  <Text className='hint-text'>← 向左滑动进入下一题</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* AI对话组件 */}
      {showAIChat && (
        <AIChat
          questionId={currentQuestion?.id}
          question={currentQuestion}
          visible={showAIChat}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </View>
  )
}

export default Question