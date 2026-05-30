import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  Download as DownloadIcon,
  Monitor,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
} from 'lucide-react'
import QRCode from 'qrcode'
import { Mascot } from '@/components/Mascot'
import { api } from '@/api/client'

interface Release {
  version: string
  versionCode: number
  fileName: string
  sizeBytes: number
  sha256: string
  url: string
  releasedAt: string
}

function isMobileUA() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|HarmonyOS/i.test(navigator.userAgent)
}

const FEATURES = [
  { icon: Bell, title: '稳定的学习提醒', desc: '到点 OS 级通知，不再错过任务' },
  { icon: Timer, title: '后台番茄钟', desc: '锁屏倒计时，更专注' },
  { icon: Sparkles, title: '随时与书院熊对话', desc: '主屏一键直达，告别浏览器跳转' },
  { icon: ShieldCheck, title: '本地隐私优先', desc: '打卡热力图直接存设备' },
]

export default function Download() {
  const nav = useNavigate()
  const [qr, setQr] = useState<string | null>(null)
  const [isMobile] = useState(() => isMobileUA())

  const { data: release, isLoading } = useQuery({
    queryKey: ['android-release'],
    queryFn: () => api<Release>('/download/android'),
  })

  useEffect(() => {
    if (!release?.url) return
    QRCode.toDataURL(release.url, {
      width: 256,
      margin: 1,
      color: { dark: '#1f1d1c', light: '#fffdf8' },
    })
      .then(setQr)
      .catch(() => setQr(null))
  }, [release?.url])

  const sizeMB = release ? (release.sizeBytes / 1024 / 1024).toFixed(1) : '—'

  return (
    <div className="container-app pb-32 pt-[max(env(safe-area-inset-top),12px)]">
      <header className="flex items-center justify-between py-3">
        <button onClick={() => nav(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
          <ChevronLeft size={18} />
        </button>
        <div className="text-base font-bold">下载 App</div>
        <div className="w-9" />
      </header>

      {/* Hero */}
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 px-5 pb-8 pt-6 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20">
              <Mascot size={56} mood="reading" />
            </div>
            <div>
              <div className="text-[12px] opacity-85">学海小书院 · Android</div>
              <div className="text-2xl font-extrabold leading-tight">v{release?.version ?? '—'}</div>
              <div className="text-[11px] opacity-80">{sizeMB} MB · {release?.releasedAt?.slice(0, 10) ?? '—'}</div>
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-white/90">
            装上 App 才能在锁屏状态下也准时收到学习提醒、保持后台番茄钟运行 ✨
          </p>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="h-12 animate-pulse rounded-2xl bg-brand-50" />
          ) : !release ? (
            <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
              暂未发布安装包，请稍候。
            </div>
          ) : isMobile ? (
            <a
              href={release.url}
              className="btn-primary w-full"
              download={release.fileName}
            >
              <DownloadIcon size={18} /> 下载 APK ({sizeMB}MB)
            </a>
          ) : (
            <div className="flex flex-col items-center">
              <Monitor className="mb-1 text-ink-500" size={20} />
              <div className="text-sm font-semibold">这是 PC 端，用手机扫描下方二维码下载</div>
              <div className="my-3 rounded-2xl bg-white p-3 shadow-card">
                {qr ? <img src={qr} alt="APK 下载二维码" className="h-44 w-44" /> : <div className="h-44 w-44 animate-pulse rounded-xl bg-brand-50" />}
              </div>
              <a
                href={release.url}
                className="btn-ghost"
                download={release.fileName}
              >
                <DownloadIcon size={14} /> 直接下载到本机
              </a>
            </div>
          )}

          {release && (
            <div className="mt-3 rounded-2xl bg-brand-50/60 p-3 text-[11px] text-ink-500">
              <div className="flex items-center gap-1 font-medium text-ink-700">
                <ShieldCheck size={12} /> 校验信息
              </div>
              <div className="mt-1 break-all">SHA-256: {release.sha256}</div>
            </div>
          )}
        </div>
      </section>

      {/* 特性 */}
      <section className="mt-4">
        <h3 className="mb-2 text-sm font-bold">为什么要装 App？</h3>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon size={18} />
              </div>
              <div className="mt-2 text-sm font-bold">{f.title}</div>
              <div className="mt-0.5 text-[11px] text-ink-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 安装指引 */}
      <section className="mt-4">
        <h3 className="mb-2 text-sm font-bold">安装步骤</h3>
        <ol className="card space-y-3 p-4 text-sm">
          {[
            '使用 Android 手机扫码或下载 APK',
            '系统提示「未知来源应用」时，前往 设置 → 安全 → 允许此次安装',
            '安装后打开学海小书院，登录已有账号',
            '在「我的 → 设置」里打开通知权限，即可接收学习提醒',
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">{i + 1}</span>
              <span className="text-ink-700">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-ink-500">
          <Smartphone size={12} className="inline" /> Android 7.0+ · 适配主流国产 ROM（MIUI / HarmonyOS / ColorOS 等）
        </p>
      </section>

      {/* 底部联动 */}
      <section className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-50/60 p-3 text-[11px] text-ink-600">
        <CheckCircle2 size={14} className="text-emerald-500" />
        装好后回到「学习计划」详情页就能逐条点击「🔔 提醒我」啦
      </section>
    </div>
  )
}
