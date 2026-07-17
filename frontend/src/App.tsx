import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AppRouter } from './router'
import './index.css'

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
