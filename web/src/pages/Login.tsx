import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mascot } from '@/components/Mascot'
import { api } from '@/api/client'
import { useAuth } from '@/store/auth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, setAuth } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  if (token) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      const res = await api<{ token: string; user: any }>(`/auth/${mode}`, {
        method: 'POST',
        json: mode === 'register' ? { username, password, nickname: nickname || username } : { username, password },
      })
      setAuth(res.token, res.user)
      toast.success(mode === 'login' ? '欢迎回来 👋' : '注册成功 🎉')
      const from = (location.state as any)?.from ?? '/'
      navigate(from, { replace: true })
    } catch (e: any) {
      toast.error(e.message === 'user_exists' ? '用户名已存在' : e.message === 'invalid_credentials' ? '账号或密码错误' : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <Mascot size={120} mood="reading" bobbing />
      <h1 className="mt-4 text-2xl font-extrabold text-ink-900">学海小书院</h1>
      <p className="text-sm text-ink-500">{mode === 'login' ? '欢迎回来，今天也要继续学习鸭～' : '从这里开启你的学习冒险'}</p>

      <form onSubmit={submit} className="mt-8 w-full max-w-sm space-y-3">
        <input
          className="input"
          placeholder="账号 / 用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
        />
        {mode === 'register' && (
          <input
            className="input"
            placeholder="昵称（可选）"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        )}
        <input
          className="input"
          type="password"
          placeholder="密码（至少 6 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? '处理中…' : mode === 'login' ? '登录' : '注册并开启'}
        </button>
        <button
          type="button"
          className="w-full py-2 text-sm text-ink-500"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? '还没有账号？立即注册' : '已有账号？返回登录'}
        </button>
      </form>
    </div>
  )
}
