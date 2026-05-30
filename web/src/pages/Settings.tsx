import { useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft, Download, Smartphone, Globe } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import toast from 'react-hot-toast'

export default function Settings() {
  const nav = useNavigate()
  const notify = useNotifications()

  const handleRequestNotification = async () => {
    try {
      const result = await notify.requestPermission()
      if (result === 'granted') {
        toast.success('通知权限已开启 🔔')
      } else if (result === 'denied') {
        toast.error('通知权限被拒绝')
      }
    } catch (e) {
      toast.error('请求通知权限失败')
    }
  }

  const getStatusText = () => {
    switch (notify.status) {
      case 'granted':
        return '已开启'
      case 'denied':
        return '已拒绝'
      case 'default':
        return '未授权'
      case 'unsupported':
        return '不支持'
      default:
        return '未知'
    }
  }

  const getStatusColor = () => {
    switch (notify.status) {
      case 'granted':
        return 'text-emerald-600'
      case 'denied':
        return 'text-red-600'
      default:
        return 'text-ink-500'
    }
  }

  return (
    <div className="container-app pb-32">
      <div className="pt-[max(env(safe-area-inset-top),12px)]" />
      <header className="flex items-center justify-between py-3">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">设置</div>
        <div className="w-9" />
      </header>

      {/* 通知设置 */}
      <section className="card mt-4 p-4">
        <h3 className="mb-3 text-sm font-bold">通知设置</h3>
        
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Bell size={20} />
            </div>
            <div>
              <div className="text-sm font-bold">学习提醒</div>
              <div className="text-[11px] text-ink-500">
                {notify.isNative 
                  ? '接收学习计划的系统通知' 
                  : '接收浏览器通知提醒'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-[11px] font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>
        </div>

        {notify.status !== 'granted' && (
          <button
            onClick={handleRequestNotification}
            className="btn-primary mt-3 w-full"
          >
            开启通知权限
          </button>
        )}
      </section>

      {/* 下载 App */}
      <section className="card mt-4 p-4">
        <h3 className="mb-3 text-sm font-bold">应用</h3>
        
        <button
          onClick={() => nav('/download')}
          className="flex w-full items-center justify-between py-2"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Smartphone size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">下载 App</div>
              <div className="text-[11px] text-ink-500">
                获取更稳定的后台提醒
              </div>
            </div>
          </div>
          <ChevronLeft size={18} className="rotate-180 text-ink-500" />
        </button>
      </section>

      {/* 关于 */}
      <section className="card mt-4 p-4">
        <h3 className="mb-3 text-sm font-bold">关于</h3>
        
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Globe size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">学海小书院</div>
              <div className="text-[11px] text-ink-500">
                v1.0.0
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 调试入口 */}
      <section className="mt-4">
        <button
          onClick={() => nav('/debug')}
          className="card flex w-full items-center justify-between p-4 text-ink-400"
        >
          <div className="text-xs">调试页面</div>
          <ChevronLeft size={14} className="rotate-180" />
        </button>
      </section>
    </div>
  )
}
