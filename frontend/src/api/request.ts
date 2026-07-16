import axios from 'axios'
import { message } from 'antd'

// ===== 创建 Axios 实例 =====
const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// ===== 请求拦截器：自动携带 Token =====
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ===== 响应拦截器：统一处理错误 =====
request.interceptors.response.use(
  (response) => {
    // 后端返回统一格式：{ code, message, data, timestamp }
    const res = response.data
    if (res.code && res.code !== 200) {
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    // 业务成功：返回 data 字段（或整个响应体如果没有 code）
    return res.data ?? res
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      const msg = data?.message || data?.detail || '请求失败'

      switch (status) {
        case 401:
          // Token 无效或过期 → 清登录态 → 跳转登录页
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          message.error('登录状态已失效，请重新登录')
          break
        case 403:
          message.error('没有权限执行此操作')
          break
        case 409:
          message.error(msg)
          break
        default:
          message.error(msg)
      }
      return Promise.reject(new Error(msg))
    }
    // 网络错误
    message.error('网络连接失败，请检查后端是否启动')
    return Promise.reject(new Error('网络连接失败'))
  }
)

export default request
