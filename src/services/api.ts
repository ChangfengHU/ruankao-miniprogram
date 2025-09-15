import Taro from '@tarojs/taro'

// API基础配置
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8000/api/v1'
  : 'https://your-production-api.com/api/v1'

// 通用请求配置
interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
}

// 响应数据结构
interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  code?: number
}

// HTTP客户端类
class HttpClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    }
  }

  // 获取存储的token
  private getToken(): string | null {
    try {
      return Taro.getStorageSync('auth_token') || null
    } catch (error) {
      console.error('获取token失败:', error)
      return null
    }
  }

  // 设置认证头
  private getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    const headers = { ...this.defaultHeaders }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    return headers
  }

  // 通用请求方法
  private async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const { url, method = 'GET', data, header = {} } = config
    
    try {
      // 显示loading
      if (method !== 'GET') {
        Taro.showLoading({ title: '请求中...' })
      }

      const response = await Taro.request({
        url: `${this.baseURL}${url}`,
        method,
        data,
        header: {
          ...this.getAuthHeaders(),
          ...header
        },
        timeout: 30000
      })

      // 隐藏loading
      if (method !== 'GET') {
        Taro.hideLoading()
      }

      // 处理HTTP错误
      if (response.statusCode >= 400) {
        throw new Error(`HTTP ${response.statusCode}: ${response.data?.message || '请求失败'}`)
      }

      // 返回标准格式
      return {
        success: true,
        data: response.data,
        message: response.data?.message,
        code: response.statusCode
      }

    } catch (error) {
      // 隐藏loading
      if (method !== 'GET') {
        Taro.hideLoading()
      }

      console.error('请求失败:', error)
      
      // 处理网络错误
      if (error.errMsg && error.errMsg.includes('timeout')) {
        throw new Error('请求超时，请检查网络连接')
      }
      
      // 处理认证错误
      if (error.statusCode === 401) {
        // 清除token并跳转登录
        Taro.removeStorageSync('auth_token')
        Taro.showToast({ title: '登录已过期', icon: 'none' })
        return {
          success: false,
          data: null,
          message: '登录已过期，请重新登录'
        }
      }

      throw error
    }
  }

  // GET请求
  async get<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let fullUrl = url
    
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')
      fullUrl = `${url}?${queryString}`
    }

    return this.request<T>({ url: fullUrl, method: 'GET' })
  }

  // POST请求
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'POST', data })
  }

  // PUT请求
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PUT', data })
  }

  // DELETE请求
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'DELETE' })
  }

  // 上传文件
  async upload<T>(url: string, filePath: string, formData?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      Taro.showLoading({ title: '上传中...' })

      const response = await Taro.uploadFile({
        url: `${this.baseURL}${url}`,
        filePath,
        name: 'file',
        formData,
        header: this.getAuthHeaders()
      })

      Taro.hideLoading()

      const result = JSON.parse(response.data)
      return {
        success: response.statusCode === 200,
        data: result,
        message: result?.message
      }
    } catch (error) {
      Taro.hideLoading()
      throw error
    }
  }
}

// 创建HTTP客户端实例
const httpClient = new HttpClient(API_BASE_URL)

// 导出HTTP客户端
export default httpClient

// 导出便捷方法
export const { get, post, put, delete: del, upload } = httpClient