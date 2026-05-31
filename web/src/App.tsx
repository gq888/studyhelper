import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/store/auth'
import { BottomNav, SideNav } from '@/components/BottomNav'
import { BackgroundTaskFloater } from '@/components/BackgroundTaskFloater'
import { ClipboardLinkPrompt } from '@/components/ClipboardLinkPrompt'
import { InstallAppConfirm } from '@/components/InstallAppConfirm'
import { useClipboardLink, type ClipboardHit } from '@/hooks/useClipboardLink'
import { startVideoExtract } from '@/store/bgTasks'
import Splash from '@/pages/Splash'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Extract from '@/pages/Extract'
import Course from '@/pages/Course'
import Chat from '@/pages/Chat'
import Rate from '@/pages/Rate'
import Profile from '@/pages/Profile'
import Mall from '@/pages/Mall'
import Product from '@/pages/Product'
import Cart from '@/pages/Cart'
import Orders from '@/pages/Orders'
import Library from '@/pages/Library'
import KbList from '@/pages/KbList'
import KbDetail from '@/pages/KbDetail'
import Plans from '@/pages/Plans'
import PlanDetail from '@/pages/PlanDetail'
import Download from '@/pages/Download'
import Debug from '@/pages/Debug'
import Settings from '@/pages/Settings'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

export default function App() {
  const [splashing, setSplashing] = useState(() => !sessionStorage.getItem('splashed'))
  useEffect(() => {
    if (splashing) {
      const t = setTimeout(() => {
        sessionStorage.setItem('splashed', '1')
        setSplashing(false)
      }, 2200)
      return () => clearTimeout(t)
    }
  }, [splashing])

  if (splashing) return <Splash />

  return (
    <div className="flex min-h-full bg-paper">
      <SideNav />
      <main className="relative flex-1 pb-[var(--bottom-nav-h)] md:pb-6">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/extract" element={<RequireAuth><Extract /></RequireAuth>} />
          <Route path="/course/:id" element={<RequireAuth><Course /></RequireAuth>} />
          <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
          <Route path="/chat/:sessionId" element={<RequireAuth><Chat /></RequireAuth>} />
          <Route path="/rate/:courseId" element={<RequireAuth><Rate /></RequireAuth>} />
          <Route path="/me" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/mall" element={<RequireAuth><Mall /></RequireAuth>} />
          <Route path="/product/:id" element={<RequireAuth><Product /></RequireAuth>} />
          <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/library" element={<RequireAuth><Library /></RequireAuth>} />
          <Route path="/kb" element={<RequireAuth><KbList /></RequireAuth>} />
          <Route path="/kb/:id" element={<RequireAuth><KbDetail /></RequireAuth>} />
          <Route path="/plans" element={<RequireAuth><Plans /></RequireAuth>} />
          <Route path="/plans/:id" element={<RequireAuth><PlanDetail /></RequireAuth>} />
          <Route path="/download" element={<Download />} />
          <Route path="/debug" element={<Debug />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <BackgroundTaskFloater />
      <InstallAppConfirm />
      <ClipboardLinkWatcher />
    </div>
  )
}

/**
 * 全局剪贴板链接监测：仅在已登录时启用。
 * - 检测到链接 → 弹出提示卡
 * - 用户点「立即解析」→ 走 bgTasks 后台流水线，浮窗显示进度
 * - 用户点「忽略」→ 记入 dismissed 列表，24h 内同 URL 不再打扰
 */
function ClipboardLinkWatcher() {
  const { token } = useAuth()
  const [hit, setHit] = useState<ClipboardHit | null>(null)
  const { dismiss } = useClipboardLink((h) => {
    // 未登录时静默：避免在 Login 页弹出
    if (!token) return
    setHit(h)
  })

  return (
    <ClipboardLinkPrompt
      hit={hit}
      onClose={() => {
        if (hit) dismiss(hit.url)
        setHit(null)
      }}
      onParse={(h) => {
        startVideoExtract({ url: h.url, notifyOnComplete: false })
        toast.success('已加入后台解析，右下角浮窗看进度 ✨')
        // 解析过的就视作已处理，不再重提
        dismiss(h.url)
        setHit(null)
      }}
    />
  )
}
