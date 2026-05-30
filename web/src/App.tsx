import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@/store/auth'
import { BottomNav, SideNav } from '@/components/BottomNav'
import { BackgroundTaskFloater } from '@/components/BackgroundTaskFloater'
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
import Plans from '@/pages/Plans'
import PlanDetail from '@/pages/PlanDetail'
import Download from '@/pages/Download'
import Debug from '@/pages/Debug'

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
      <main className="relative flex-1 pb-24 md:pb-6">
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
          <Route path="/plans" element={<RequireAuth><Plans /></RequireAuth>} />
          <Route path="/plans/:id" element={<RequireAuth><PlanDetail /></RequireAuth>} />
          <Route path="/download" element={<Download />} />
          <Route path="/debug" element={<Debug />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <BackgroundTaskFloater />
    </div>
  )
}
