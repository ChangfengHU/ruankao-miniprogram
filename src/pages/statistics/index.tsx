import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { useAppStore } from '@/store'
import './index.scss'

const StatisticsPage = () => {
  const { userProfile, answerHistory, getWrongQuestionStats } = useAppStore()
  const [dailyStats, setDailyStats] = useState([])
  const [weeklyStats, setWeeklyStats] = useState([])
  const [knowledgePointStats, setKnowledgePointStats] = useState([])

  useEffect(() => {
    if (answerHistory && Array.isArray(answerHistory)) {
      calculateStatistics()
    }
  }, [answerHistory])

  const calculateStatistics = () => {
    try {
      // 按日期分组统计
      const dailyData = {}
      const today = new Date()
      
      // 生成过去7天的数据
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        dailyData[dateStr] = {
          date: dateStr,
          total: 0,
          correct: 0,
          accuracy: 0,
          displayDate: `${date.getMonth() + 1}/${date.getDate()}`
        }
      }

      // 统计答题记录
      if (answerHistory && Array.isArray(answerHistory)) {
        answerHistory.forEach(record => {
          if (record && record.answeredAt) {
            const recordDate = record.answeredAt.split('T')[0]
            if (dailyData[recordDate]) {
              dailyData[recordDate].total += 1
              if (record.isCorrect) {
                dailyData[recordDate].correct += 1
              }
            }
          }
        })
      }

      // 计算准确率
      const dailyArray = Object.values(dailyData).map(day => ({
        ...day,
        accuracy: day.total > 0 ? Math.round((day.correct / day.total) * 100) : 0
      }))

      setDailyStats(dailyArray)

      // 知识点统计
      const knowledgeStats = Object.entries(userProfile.masteryMatrix || {})
        .map(([point, mastery]) => ({
          name: point,
          mastery: Math.round((mastery || 0) * 100),
          questionsCount: (answerHistory || []).filter(record => 
            record && record.question && record.question.knowledgePoints && record.question.knowledgePoints.includes(point)
          ).length
        }))
        .sort((a, b) => b.questionsCount - a.questionsCount)

      setKnowledgePointStats(knowledgeStats.slice(0, 10))
    } catch (error) {
      console.error('Error calculating statistics:', error)
      setDailyStats([])
      setKnowledgePointStats([])
    }
  }

  const wrongStats = getWrongQuestionStats()
  
  const overallAccuracy = (userProfile && userProfile.totalQuestions > 0)
    ? Math.round((userProfile.correctAnswers / userProfile.totalQuestions) * 100)
    : 0

  const averageResponseTime = (answerHistory && Array.isArray(answerHistory) && answerHistory.length > 0)
    ? Math.round(answerHistory.reduce((sum, record) => sum + (record.responseTime || 0), 0) / answerHistory.length / 1000)
    : 0

  return (
    <View className="statistics-page">
      <ScrollView className="content" scrollY>
        {/* 总体统计 */}
        <View className="overview-section">
          <Text className="section-title">总体表现</Text>
          
          <View className="overview-grid">
            <View className="overview-card">
              <View className="overview-icon total">
                <Text className="icon">📊</Text>
              </View>
              <Text className="overview-number">{(userProfile && userProfile.totalQuestions) || 0}</Text>
              <Text className="overview-label">总答题数</Text>
            </View>

            <View className="overview-card">
              <View className="overview-icon accuracy">
                <Text className="icon">🎯</Text>
              </View>
              <Text className="overview-number">{overallAccuracy}%</Text>
              <Text className="overview-label">正确率</Text>
            </View>

            <View className="overview-card">
              <View className="overview-icon time">
                <Text className="icon">⏱️</Text>
              </View>
              <Text className="overview-number">{averageResponseTime}s</Text>
              <Text className="overview-label">平均用时</Text>
            </View>

            <View className="overview-card">
              <View className="overview-icon streak">
                <Text className="icon">🔥</Text>
              </View>
              <Text className="overview-number">{(userProfile && userProfile.longestStreak) || 0}</Text>
              <Text className="overview-label">最高连击</Text>
            </View>
          </View>
        </View>

        {/* 7天趋势 */}
        <View className="trend-section">
          <Text className="section-title">7天趋势</Text>
          
          <View className="chart-container">
            <View className="chart-legend">
              <View className="legend-item">
                <View className="legend-color total-bar"></View>
                <Text className="legend-text">答题数</Text>
              </View>
              <View className="legend-item">
                <View className="legend-color accuracy-line"></View>
                <Text className="legend-text">正确率</Text>
              </View>
            </View>

            <View className="chart">
              {dailyStats.map((day, index) => (
                <View key={day.date} className="chart-bar-group">
                  <View className="chart-bar-container">
                    <Text className="accuracy-text">{day.accuracy}%</Text>
                    <View 
                      className="chart-bar"
                      style={{ 
                        height: `${Math.max(day.total * 10, 4)}px`,
                        background: day.total > 0 
                          ? `linear-gradient(to top, var(--color-primary) 0%, var(--color-primary-light) 100%)`
                          : 'var(--color-border)'
                      }}
                    />
                    <Text className="bar-label">{day.total}</Text>
                  </View>
                  <Text className="chart-date">{day.displayDate}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 错题分析 */}
        <View className="wrong-analysis-section">
          <Text className="section-title">错题分析</Text>
          
          <View className="wrong-stats-grid">
            <View className="wrong-stat-card">
              <Text className="wrong-stat-number">{wrongStats.totalWrong}</Text>
              <Text className="wrong-stat-label">错题总数</Text>
            </View>
            
            <View className="wrong-stat-card">
              <Text className="wrong-stat-number">{wrongStats.accuracy}%</Text>
              <Text className="wrong-stat-label">整体正确率</Text>
            </View>
            
            <View className="wrong-stat-card">
              <Text className="wrong-stat-number">
                {wrongStats.totalAnswered > 0 
                  ? Math.round((wrongStats.totalWrong / wrongStats.totalAnswered) * 100)
                  : 0
                }%
              </Text>
              <Text className="wrong-stat-label">错误率</Text>
            </View>
          </View>

          <View className="progress-indicator">
            <Text className="progress-text">学习进度</Text>
            <View className="progress-bar">
              <View 
                className="progress-fill"
                style={{ width: `${wrongStats.accuracy}%` }}
              />
            </View>
            <Text className="progress-percentage">{wrongStats.accuracy}%</Text>
          </View>
        </View>

        {/* 知识点掌握度 */}
        <View className="knowledge-section">
          <Text className="section-title">知识点掌握度</Text>
          
          <View className="knowledge-list">
            {knowledgePointStats.map((item, index) => (
              <View key={item.name} className="knowledge-item">
                <View className="knowledge-header">
                  <Text className="knowledge-name">{item.name}</Text>
                  <Text className="knowledge-count">({item.questionsCount}题)</Text>
                </View>
                
                <View className="mastery-progress">
                  <View className="mastery-bar">
                    <View 
                      className="mastery-fill"
                      style={{ 
                        width: `${item.mastery}%`,
                        background: item.mastery >= 80 
                          ? 'var(--color-success)'
                          : item.mastery >= 60
                          ? 'var(--color-warning)' 
                          : 'var(--color-error)'
                      }}
                    />
                  </View>
                  <Text className="mastery-percentage">{item.mastery}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 学习建议 */}
        <View className="suggestions-section">
          <Text className="section-title">学习建议</Text>
          
          <View className="suggestions-list">
            {overallAccuracy < 60 && (
              <View className="suggestion-item">
                <View className="suggestion-icon warning">
                  <Text className="icon">⚠️</Text>
                </View>
                <Text className="suggestion-text">
                  当前正确率较低，建议回顾基础知识点，巩固理论基础
                </Text>
              </View>
            )}
            
            {wrongStats.totalWrong > 10 && (
              <View className="suggestion-item">
                <View className="suggestion-icon error">
                  <Text className="icon">📖</Text>
                </View>
                <Text className="suggestion-text">
                  错题较多，建议重点复习错题本，针对性提升薄弱环节
                </Text>
              </View>
            )}
            
            {userProfile.longestStreak < 5 && (
              <View className="suggestion-item">
                <View className="suggestion-icon streak">
                  <Text className="icon">🔥</Text>
                </View>
                <Text className="suggestion-text">
                  连击数较低，建议增加练习频率，培养做题的连贯性
                </Text>
              </View>
            )}
            
            {overallAccuracy >= 80 && (
              <View className="suggestion-item">
                <View className="suggestion-icon success">
                  <Text className="icon">🎉</Text>
                </View>
                <Text className="suggestion-text">
                  表现优秀！建议尝试更高难度的题目，进一步提升水平
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default StatisticsPage