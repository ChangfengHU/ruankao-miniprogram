import React, { useEffect, useState } from 'react'
import { View, Text, Image, Button, Navigator } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import './index.scss'

const Profile = () => {
  const [userStats, setUserStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    accuracy: 0,
    streak: 0,
    level: 1,
    experience: 0,
    nextLevelExp: 100
  })

  const [achievements, setAchievements] = useState([
    {
      id: 1,
      title: '初学者',
      description: '完成第一题',
      icon: '🎯',
      unlocked: true
    },
    {
      id: 2,
      title: '连胜达人',
      description: '连续答对5题',
      icon: '🔥',
      unlocked: false
    },
    {
      id: 3,
      title: '学霸',
      description: '正确率达到80%',
      icon: '📚',
      unlocked: false
    },
    {
      id: 4,
      title: '软考专家',
      description: '完成100题',
      icon: '💎',
      unlocked: false
    }
  ])

  const [studyStats, setStudyStats] = useState({
    todayQuestions: 12,
    weeklyGoal: 50,
    weeklyProgress: 28,
    currentStreak: 5,
    bestStreak: 12
  })

  useLoad(() => {
    console.log('Profile page loaded')
    // 这里可以从存储中加载用户数据
    loadUserStats()
  })

  const loadUserStats = () => {
    // 模拟从本地存储或API加载数据
    setUserStats({
      totalQuestions: 45,
      correctAnswers: 38,
      accuracy: 84.4,
      streak: 5,
      level: 3,
      experience: 240,
      nextLevelExp: 300
    })
  }

  const getLevelProgress = () => {
    return (userStats.experience / userStats.nextLevelExp) * 100
  }

  return (
    <View className="profile-page">
      {/* 头部区域 */}
      <View className="header-section safe-area-top">
        <View className="header-background">
          <View className="header-content">
            <View className="avatar-section">
              <View className="avatar-container">
                <Image 
                  className="avatar" 
                  src="https://img.icons8.com/fluency/96/user-male-circle.png"
                  mode="aspectFill"
                />
                <View className="level-badge">
                  <Text className="level-text">Lv.{userStats.level}</Text>
                </View>
              </View>
              <View className="user-info">
                <Text className="username">软考学习者</Text>
                <Text className="user-title">程序员</Text>
              </View>
            </View>
            
            {/* 经验进度条 */}
            <View className="experience-bar">
              <View className="exp-info">
                <Text className="exp-text">经验值 {userStats.experience}/{userStats.nextLevelExp}</Text>
                <Text className="level-up-text">距离下一级还需 {userStats.nextLevelExp - userStats.experience} EXP</Text>
              </View>
              <View className="progress-container">
                <View className="progress-track">
                  <View 
                    className="progress-fill"
                    style={{ width: `${getLevelProgress()}%` }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 统计卡片区域 */}
      <View className="stats-section">
        <View className="stats-grid">
          <View className="stat-card glass animate-slide-up">
            <View className="stat-icon">📊</View>
            <Text className="stat-value">{userStats.totalQuestions}</Text>
            <Text className="stat-label">总题数</Text>
          </View>
          
          <View className="stat-card glass animate-slide-up">
            <View className="stat-icon">✅</View>
            <Text className="stat-value">{userStats.correctAnswers}</Text>
            <Text className="stat-label">答对题数</Text>
          </View>
          
          <View className="stat-card glass animate-slide-up">
            <View className="stat-icon">🎯</View>
            <Text className="stat-value">{userStats.accuracy}%</Text>
            <Text className="stat-label">正确率</Text>
          </View>
          
          <View className="stat-card glass animate-slide-up">
            <View className="stat-icon">🔥</View>
            <Text className="stat-value">{userStats.streak}</Text>
            <Text className="stat-label">连胜</Text>
          </View>
        </View>
      </View>

      {/* 今日学习 */}
      <View className="today-study-section">
        <View className="section-header">
          <Text className="section-title">今日学习</Text>
          <Text className="section-subtitle">Keep going! 💪</Text>
        </View>
        
        <View className="study-card card-glass">
          <View className="study-progress">
            <View className="progress-info">
              <Text className="progress-title">本周目标</Text>
              <Text className="progress-value">{studyStats.weeklyProgress}/{studyStats.weeklyGoal} 题</Text>
            </View>
            <View className="circular-progress">
              <View className="progress-circle">
                <Text className="progress-percent">
                  {Math.round((studyStats.weeklyProgress / studyStats.weeklyGoal) * 100)}%
                </Text>
              </View>
            </View>
          </View>
          
          <View className="study-actions">
            <Navigator url="/pages/question/index" className="study-btn">
              <View className="btn btn-primary">
                <Text>开始刷题 🚀</Text>
              </View>
            </Navigator>
          </View>
        </View>
      </View>

      {/* 成就系统 */}
      <View className="achievements-section">
        <View className="section-header">
          <Text className="section-title">成就徽章</Text>
          <Text className="section-subtitle">解锁你的学习成就</Text>
        </View>
        
        <View className="achievements-grid">
          {achievements.map((achievement, index) => (
            <View 
              key={achievement.id}
              className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'} animate-slide-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <View className="achievement-icon">
                <Text className={achievement.unlocked ? 'icon-unlocked' : 'icon-locked'}>
                  {achievement.unlocked ? achievement.icon : '🔒'}
                </Text>
              </View>
              <Text className="achievement-title">{achievement.title}</Text>
              <Text className="achievement-desc">{achievement.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 学习记录 */}
      <View className="records-section">
        <View className="section-header">
          <Text className="section-title">学习记录</Text>
          <Text className="section-subtitle">追踪你的学习轨迹</Text>
        </View>
        
        <View className="records-card card-glass">
          <View className="record-item">
            <View className="record-icon">📚</View>
            <View className="record-content">
              <Text className="record-title">今日已学习</Text>
              <Text className="record-value">{studyStats.todayQuestions} 题</Text>
            </View>
            <View className="record-trend up">
              <Text className="trend-text">↗️ +25%</Text>
            </View>
          </View>
          
          <View className="record-divider" />
          
          <View className="record-item">
            <View className="record-icon">🔥</View>
            <View className="record-content">
              <Text className="record-title">当前连胜</Text>
              <Text className="record-value">{studyStats.currentStreak} 天</Text>
            </View>
            <View className="record-best">
              <Text className="best-text">最佳: {studyStats.bestStreak}天</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 快捷操作 */}
      <View className="quick-actions-section safe-area-bottom">
        <View className="actions-grid">
          <Navigator url="/pages/statistics/index" className="action-item">
            <View className="action-card card-glass">
              <View className="action-icon">📈</View>
              <Text className="action-title">学习统计</Text>
            </View>
          </Navigator>
          
          <Navigator url="/pages/wrongAnswers/index" className="action-item">
            <View className="action-card card-glass">
              <View className="action-icon">❌</View>
              <Text className="action-title">错题本</Text>
            </View>
          </Navigator>
          
          <View className="action-item" onClick={() => console.log('设置')}>
            <View className="action-card card-glass">
              <View className="action-icon">⚙️</View>
              <Text className="action-title">设置</Text>
            </View>
          </View>
          
          <View className="action-item" onClick={() => console.log('分享')}>
            <View className="action-card card-glass">
              <View className="action-icon">📱</View>
              <Text className="action-title">分享</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

export default Profile