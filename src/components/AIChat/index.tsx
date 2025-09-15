import React, { useState, useEffect, useRef } from 'react'
import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAIStore } from '../../store'
import aiConversationService from '../../services/aiConversation'
import './index.scss'

const AIChat = ({ questionId, question, visible, onClose }) => {
  const aiStore = useAIStore()
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const scrollViewRef = useRef()

  // 初始化会话
  useEffect(() => {
    if (visible && !sessionId) {
      const newSessionId = aiStore.startNewSession()
      setSessionId(newSessionId)
      
      // 添加欢迎消息
      const welcomeMessage = {
        id: `welcome_${Date.now()}`,
        type: 'assistant',
        content: question 
          ? `你好！我看到你正在做关于"${question.subject}"的题目，有什么需要我帮助解答的吗？`
          : '你好！我是你的AI学习助手，有什么软考相关的问题都可以问我！',
        timestamp: Date.now(),
        messageType: 'text',
        suggestions: [
          '解释这道题目',
          '相关知识点讲解', 
          '学习建议',
          '推荐练习题'
        ]
      }
      
      setMessages([welcomeMessage])
      
      // 存储到store中
      aiStore.addMessage(newSessionId, {
        type: 'assistant',
        content: welcomeMessage.content
      })
    }
  }, [visible, sessionId, question])

  // 滚动到底部
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTop = scrollViewRef.current.scrollHeight
      }
    }, 100)
  }

  // 发送消息
  const sendMessage = async () => {
    if (!inputText.trim() || !sessionId || isLoading) return

    const userMessage = {
      id: `user_${Date.now()}`,
      type: 'user', 
      content: inputText.trim(),
      timestamp: Date.now()
    }

    // 添加用户消息
    setMessages(prev => [...prev, userMessage])
    aiStore.addMessage(sessionId, {
      type: 'user',
      content: userMessage.content
    })

    // 清空输入
    setInputText('')
    setIsLoading(true)
    aiStore.setTyping(true)

    scrollToBottom()

    try {
      // 构建上下文
      const context = {
        currentQuestion: question,
        questionId,
        userWeakAreas: ['数据结构', '算法设计'] // 这里可以从用户画像中获取
      }

      // 调用AI对话服务
      const response = await aiConversationService.sendMessage(
        sessionId,
        userMessage.content,
        context
      )

      // 添加AI回复
      const aiMessage = {
        id: `ai_${Date.now()}`,
        type: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
        suggestions: response.suggestions,
        relatedTopics: response.relatedTopics,
        messageType: response.messageType
      }

      setMessages(prev => [...prev, aiMessage])
      aiStore.addMessage(sessionId, {
        type: 'assistant',
        content: response.reply
      })

      scrollToBottom()

    } catch (error) {
      console.error('发送消息失败:', error)
      
      // 添加错误消息
      const errorMessage = {
        id: `error_${Date.now()}`,
        type: 'assistant',
        content: '抱歉，我暂时无法回复。请稍后再试或重新提问。',
        timestamp: Date.now(),
        messageType: 'text'
      }
      
      setMessages(prev => [...prev, errorMessage])
      
      Taro.showToast({
        title: '发送失败，请重试',
        icon: 'none'
      })
    } finally {
      setIsLoading(false)
      aiStore.setTyping(false)
    }
  }

  // 点击建议
  const handleSuggestionClick = (suggestion) => {
    setInputText(suggestion)
  }

  // 点击相关话题
  const handleTopicClick = (topic) => {
    setInputText(`请详细讲解${topic}相关知识`)
  }

  // 关闭对话
  const handleClose = () => {
    if (sessionId) {
      aiConversationService.clearSession(sessionId)
      aiStore.clearConversation(sessionId)
    }
    setMessages([])
    setSessionId(null)
    setInputText('')
    onClose()
  }

  if (!visible) return null

  return (
    <View className='ai-chat-container'>
      {/* 顶部标题栏 */}
      <View className='chat-header'>
        <View className='header-content'>
          <View className='chat-title'>
            <Text className='title-text'>🤖 AI学习助手</Text>
            {question && (
              <Text className='subtitle-text'>{question.subject}</Text>
            )}
          </View>
          <View className='chat-actions'>
            <Button 
              className='close-btn'
              size='mini'
              onClick={handleClose}
            >
              关闭
            </Button>
          </View>
        </View>
      </View>

      {/* 对话区域 */}
      <ScrollView 
        ref={scrollViewRef}
        className='chat-messages'
        scrollY
        scrollIntoView='latest'
        enableBackToTop
        scrollWithAnimation
      >
        {messages.map((message, index) => (
          <View key={message.id} className={`message-item ${message.type}`}>
            {message.type === 'assistant' && (
              <View className='message-avatar'>
                <Text className='avatar-icon'>🤖</Text>
              </View>
            )}
            
            <View className='message-content'>
              <View className={`message-bubble ${message.type} ${message.messageType || 'text'}`}>
                <Text className='message-text'>{message.content}</Text>
                
                {/* 时间戳 */}
                <View className='message-time'>
                  <Text className='time-text'>
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              </View>

              {/* 建议按钮 */}
              {message.suggestions && message.suggestions.length > 0 && (
                <View className='message-suggestions'>
                  {message.suggestions.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      className='suggestion-btn'
                      size='mini'
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </View>
              )}

              {/* 相关话题 */}
              {message.relatedTopics && message.relatedTopics.length > 0 && (
                <View className='message-topics'>
                  <Text className='topics-label'>相关话题：</Text>
                  <View className='topics-list'>
                    {message.relatedTopics.map((topic, idx) => (
                      <Text
                        key={idx}
                        className='topic-tag'
                        onClick={() => handleTopicClick(topic)}
                      >
                        #{topic}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {message.type === 'user' && (
              <View className='message-avatar user'>
                <Text className='avatar-icon'>👤</Text>
              </View>
            )}
          </View>
        ))}

        {/* 正在输入指示器 */}
        {isLoading && (
          <View className='message-item assistant'>
            <View className='message-avatar'>
              <Text className='avatar-icon'>🤖</Text>
            </View>
            <View className='message-content'>
              <View className='message-bubble typing'>
                <View className='typing-indicator'>
                  <View className='typing-dot'></View>
                  <View className='typing-dot'></View>
                  <View className='typing-dot'></View>
                </View>
              </View>
            </View>
          </View>
        )}
        
        <View id='latest'></View>
      </ScrollView>

      {/* 输入区域 */}
      <View className='chat-input-area'>
        <View className='input-container'>
          <Input
            className='message-input'
            placeholder='输入你的问题...'
            value={inputText}
            onInput={(e) => setInputText(e.detail.value)}
            onConfirm={sendMessage}
            confirmType='send'
            maxlength={500}
            disabled={isLoading}
          />
          <Button
            className={`send-btn ${inputText.trim() && !isLoading ? 'active' : ''}`}
            size='mini'
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            发送
          </Button>
        </View>

        {/* 快捷输入 */}
        <View className='quick-inputs'>
          {[
            '这道题怎么解？',
            '解释相关知识点',
            '给出学习建议',
            '推荐类似题目'
          ].map((quickText, index) => (
            <Button
              key={index}
              className='quick-btn'
              size='mini'
              onClick={() => setInputText(quickText)}
              disabled={isLoading}
            >
              {quickText}
            </Button>
          ))}
        </View>
      </View>
    </View>
  )
}

export default AIChat