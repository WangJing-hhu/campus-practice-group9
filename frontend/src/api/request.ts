import axios from 'axios'
import { message } from 'antd'

// ===== ?? Axios ?? =====
const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// ===== ?????????? Token =====
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

// ===== ???????????? =====
request.interceptors.response.use(
  (response) => {
    // ?????????{ code, message, data, timestamp }
    const res = response.data
    if (res.code && (res.code < 200 || res.code >= 300)) {
      message.error(res.message || '????')
      return Promise.reject(new Error(res.message || '????'))
    }
    // ??????? data ????????????? code?
    return res.data ?? res
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      const msg = data?.message || data?.detail || '????'

      switch (status) {
        case 401:
          // Token ????? ? ???? ? ?????
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          message.error('?????????????')
          break
        case 403:
          message.error('?????????')
          break
        case 409:
          message.error(msg)
          break
        default:
          message.error(msg)
      }
      return Promise.reject(new Error(msg))
    }
    // ????
    message.error('????????????????')
    return Promise.reject(new Error('??????'))
  }
)

export default request
