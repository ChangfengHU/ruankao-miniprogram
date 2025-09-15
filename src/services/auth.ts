import httpClient from './api'
import Taro from '@tarojs/taro'

// 认证相关接口
export interface LoginRequest {
  code: string  // 微信登录凭证
  userInfo?: {
    nickname?: string
    avatarUrl?: string
  }
}

export interface LoginResponse {
  user: {
    id: number
    openid: string
    nickname?: string
    avatarUrl?: string
    level?: number
    experience?: number
  }
  token: {
    access_token: string
    refresh_token: string
    expires_in: number
  }
}

export interface RefreshTokenRequest {
  refresh_token: string
}

// 认证服务类
class AuthService {
  
  /**
   * 微信小程序登录
   */
  async wxLogin(): Promise<LoginResponse> {
    try {
      // 1. 获取微信登录凭证
      const loginResult = await Taro.login()
      if (!loginResult.code) {
        throw new Error('获取微信登录凭证失败')
      }

      // 2. 获取用户信息（可选）
      let userInfo = {}
      try {
        const userInfoResult = await Taro.getUserProfile({
          desc: '用于完善用户资料'
        })
        userInfo = {
          nickname: userInfoResult.userInfo.nickName,
          avatarUrl: userInfoResult.userInfo.avatarUrl
        }
      } catch (error) {
        console.log('用户取消授权或获取用户信息失败')
      }

      // 3. 调用后端登录接口
      const response = await httpClient.post<LoginResponse>('/auth/wx-login', {
        code: loginResult.code,
        userInfo
      })

      if (response.success && response.data) {
        // 4. 存储token
        await this.saveToken(response.data.token)
        return response.data
      } else {
        throw new Error(response.message || '登录失败')
      }

    } catch (error) {
      console.error('微信登录失败:', error)
      throw error
    }
  }

  /**
   * 游客登录
   */
  async guestLogin(): Promise<LoginResponse> {
    try {
      const response = await httpClient.post<LoginResponse>('/auth/guest-login')
      
      if (response.success && response.data) {
        await this.saveToken(response.data.token)
        return response.data
      } else {
        throw new Error(response.message || '游客登录失败')
      }
    } catch (error) {
      console.error('游客登录失败:', error)
      throw error
    }
  }

  /**
   * 刷新token
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = Taro.getStorageSync('refresh_token')
      if (!refreshToken) {
        throw new Error('没有有效的刷新令牌')
      }

      const response = await httpClient.post<{ access_token: string }>('/auth/refresh-token', {
        refresh_token: refreshToken
      })

      if (response.success && response.data) {
        // 更新access_token
        Taro.setStorageSync('auth_token', response.data.access_token)
        return response.data.access_token
      } else {
        throw new Error(response.message || 'Token刷新失败')
      }
    } catch (error) {
      console.error('Token刷新失败:', error)
      // 刷新失败，清除所有token
      await this.clearTokens()
      throw error
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      // 调用后端登出接口
      await httpClient.post('/auth/logout')
    } catch (error) {
      console.error('后端登出失败:', error)
    } finally {
      // 清除本地token
      await this.clearTokens()
    }
  }

  /**
   * 检查登录状态
   */
  isLoggedIn(): boolean {
    const token = Taro.getStorageSync('auth_token')
    return !!token
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser() {
    try {
      const response = await httpClient.get('/auth/me')
      return response.success ? response.data : null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  }

  /**
   * 检查token是否有效
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await httpClient.get('/auth/validate')
      return response.success
    } catch (error) {
      return false
    }
  }

  /**
   * 存储token
   */
  private async saveToken(tokenData: LoginResponse['token']): Promise<void> {
    try {
      Taro.setStorageSync('auth_token', tokenData.access_token)
      Taro.setStorageSync('refresh_token', tokenData.refresh_token)
      
      // 设置token过期时间
      const expireTime = Date.now() + (tokenData.expires_in * 1000)
      Taro.setStorageSync('token_expire_time', expireTime)
    } catch (error) {
      console.error('保存token失败:', error)
      throw new Error('保存登录信息失败')
    }
  }

  /**
   * 清除所有token
   */
  private async clearTokens(): Promise<void> {
    try {
      Taro.removeStorageSync('auth_token')
      Taro.removeStorageSync('refresh_token')
      Taro.removeStorageSync('token_expire_time')
    } catch (error) {
      console.error('清除token失败:', error)
    }
  }

  /**
   * 检查token是否即将过期
   */
  isTokenExpiringSoon(): boolean {
    try {
      const expireTime = Taro.getStorageSync('token_expire_time')
      if (!expireTime) return true
      
      // 提前5分钟刷新token
      const fiveMinutes = 5 * 60 * 1000
      return Date.now() > (expireTime - fiveMinutes)
    } catch (error) {
      return true
    }
  }

  /**
   * 自动刷新token（如果需要）
   */
  async autoRefreshToken(): Promise<void> {
    if (this.isTokenExpiringSoon()) {
      try {
        await this.refreshToken()
      } catch (error) {
        console.error('自动刷新token失败:', error)
      }
    }
  }
}

// 创建认证服务实例
const authService = new AuthService()

// 导出认证服务
export default authService