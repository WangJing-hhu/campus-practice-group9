import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AppRouter } from './router'

// ===== 应用根组件 =====
// 1. 配置 Ant Design 中文语言包 + 河海蓝主题色
// 2. 包裹 BrowserRouter（前端路由）
// 3. 渲染 AppRouter（所有路由定义）
export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#005BAC',
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}
