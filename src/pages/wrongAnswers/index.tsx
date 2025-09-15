import React, { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import { useAppStore } from '@/store'
import './index.scss'

const WrongAnswersPage = () => {
  const { answerHistory, getWrongQuestions, clearWrongAnswers } = useAppStore()
  const [wrongQuestions, setWrongQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)

  useEffect(() => {
    const wrong = getWrongQuestions()
    setWrongQuestions(wrong)
  }, [answerHistory])

  const handleAnswer = (answer) => {
    const currentQuestion = wrongQuestions[currentIndex]
    if (answer === currentQuestion.correctAnswer) {
      // 答对了，从错题本中移除
      const updatedWrong = wrongQuestions.filter((_, index) => index !== currentIndex)
      setWrongQuestions(updatedWrong)
      
      if (currentIndex >= updatedWrong.length && updatedWrong.length > 0) {
        setCurrentIndex(updatedWrong.length - 1)
      }
    } else {
      setShowExplanation(true)
    }
  }

  const nextQuestion = () => {
    if (currentIndex < wrongQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowExplanation(false)
    }
  }

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setShowExplanation(false)
    }
  }

  const handleClearAll = () => {
    clearWrongAnswers()
    setWrongQuestions([])
    setCurrentIndex(0)
  }

  if (wrongQuestions.length === 0) {
    return (
      <View className="wrong-answers-page">
        <View className="empty-state">
          <View className="empty-icon">🎉</View>
          <Text className="empty-title">太棒了！没有错题</Text>
          <Text className="empty-desc">继续保持，你的答题准确率很高！</Text>
          <Button 
            className="btn btn-primary"
            onClick={() => {/* 导航回刷题页面 */}}
          >
            继续刷题
          </Button>
        </View>
      </View>
    )
  }

  const currentQuestion = wrongQuestions[currentIndex]

  return (
    <View className="wrong-answers-page">
      {/* 头部统计 */}
      <View className="stats-header safe-area-top">
        <View className="stats-item">
          <Text className="stats-number">{wrongQuestions.length}</Text>
          <Text className="stats-label">错题总数</Text>
        </View>
        <View className="stats-item">
          <Text className="stats-number">{currentIndex + 1}</Text>
          <Text className="stats-label">当前题目</Text>
        </View>
        <View className="stats-item">
          <Text className="stats-number">{Math.round((currentIndex / wrongQuestions.length) * 100)}%</Text>
          <Text className="stats-label">复习进度</Text>
        </View>
      </View>

      {/* 进度条 */}
      <View className="progress-bar">
        <View 
          className="progress-fill"
          style={{ width: `${((currentIndex + 1) / wrongQuestions.length) * 100}%` }}
        />
      </View>

      {/* 题目内容 - 现代化设计 */}
      <ScrollView className="question-container" scrollY>
        <View className="modern-question-card">
          <View className="question-header">
            <View className="difficulty-badge">
              <Text className="difficulty-text">错题复习</Text>
            </View>
            <View className="question-number">
              <Text className="number-text">第 {currentIndex + 1} 题</Text>
            </View>
          </View>
          
          <View className="question-content">
            <Text className="question-text">{currentQuestion?.content || '题目内容'}</Text>
          </View>
          
          <View className="options-list">
            {currentQuestion?.options?.map((option, index) => (
              <View 
                key={option.key}
                className="option-item"
                onClick={() => handleAnswer(option.key)}
              >
                <View className="option-marker">
                  <Text className="option-key">{option.key}</Text>
                </View>
                <Text className="option-text">{option.text}</Text>
              </View>
            ))}
          </View>
          
          {showExplanation && (
            <View className="explanation-section">
              <Text className="explanation-title">📝 解析</Text>
              <Text className="explanation-text">{currentQuestion?.explanation || '解析内容'}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 控制按钮 */}
      <View className="controls safe-area-bottom">
        <Button 
          className="btn btn-secondary control-btn"
          onClick={prevQuestion}
          disabled={currentIndex === 0}
        >
          上一题
        </Button>
        
        <Button 
          className="btn btn-ghost control-btn"
          onClick={() => setShowExplanation(!showExplanation)}
        >
          {showExplanation ? '隐藏解析' : '查看解析'}
        </Button>
        
        <Button 
          className="btn btn-secondary control-btn"
          onClick={nextQuestion}
          disabled={currentIndex === wrongQuestions.length - 1}
        >
          下一题
        </Button>
      </View>

      {/* 清空错题本 */}
      <View className="clear-section">
        <Button 
          className="btn btn-ghost clear-btn"
          onClick={handleClearAll}
        >
          清空错题本
        </Button>
      </View>
    </View>
  )
}

export default WrongAnswersPage