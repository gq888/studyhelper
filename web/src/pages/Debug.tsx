import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trash2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

interface LogEntry {
  id: number
  type: 'log' | 'error' | 'warn'
  message: string
  timestamp: string
}

const logs: LogEntry[] = []
let logId = 0

// 拦截 console 方法
const originalLog = console.log
const originalError = console.error
const originalWarn = console.warn

console.log = (...args) => {
  originalLog.apply(console, args)
  logs.push({
    id: logId++,
    type: 'log',
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
    timestamp: new Date().toLocaleTimeString()
  })
}

console.error = (...args) => {
  originalError.apply(console, args)
  logs.push({
    id: logId++,
    type: 'error',
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
    timestamp: new Date().toLocaleTimeString()
  })
}

console.warn = (...args) => {
  originalWarn.apply(console, args)
  logs.push({
    id: logId++,
    type: 'warn',
    message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
    timestamp: new Date().toLocaleTimeString()
  })
}

export default function Debug() {
  const [, forceUpdate] = useState(0)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 500)
    return () => clearInterval(interval)
  }, [])

  const clearLogs = () => {
    logs.length = 0
    toast.success('日志已清空')
  }

  const copyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.type}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('日志已复制到剪贴板')
  }

  const filteredLogs = logs.filter(l => 
    l.message.includes('[native]') || 
    l.message.includes('[notify]') || 
    l.message.includes('[notifications]') ||
    l.type === 'error'
  )

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={20} />
          <span>返回</span>
        </Link>
        <div className="flex gap-2">
          <button
            onClick={copyLogs}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Copy size={16} />
            复制
          </button>
          <button
            onClick={clearLogs}
            className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            <Trash2 size={16} />
            清空
          </button>
        </div>
      </div>

      <h1 className="text-xl font-bold mb-4">🔍 调试日志</h1>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!showAll} onChange={(e) => setShowAll(!e.target.checked)} />
          只显示相关日志（过滤）
        </label>
      </div>

      {(showAll ? logs : filteredLogs).length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          暂无相关日志，请尝试使用通知功能
        </div>
      ) : (
        <div className="space-y-2">
          {(showAll ? logs : filteredLogs).slice().reverse().map(log => (
            <div
              key={log.id}
              className={`p-3 rounded border ${
                log.type === 'error' 
                  ? 'bg-red-50 border-red-200 text-red-800' 
                  : log.type === 'warn'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-gray-50 border-gray-200 text-gray-800'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">{log.timestamp}</div>
              <div className="font-mono text-sm break-all">{log.message}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
        <h2 className="font-bold text-blue-800 mb-2">📌 使用提示</h2>
        <ol className="list-decimal list-inside text-blue-700 space-y-1 text-sm">
          <li>尝试触发通知功能（比如创建一个学习计划）</li>
          <li>查看上面显示的日志</li>
          <li>点击"复制"按钮，把日志发给开发者</li>
        </ol>
      </div>
    </div>
  )
}
