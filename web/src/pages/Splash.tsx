import { motion } from 'framer-motion'
import { Mascot } from '@/components/Mascot'

export default function Splash() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
        >
          <Mascot size={140} mood="reading" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="text-2xl font-extrabold tracking-wider text-ink-900">学海小书院</div>
          <div className="mt-1 text-sm text-ink-500">你 的 学 习 陪 伴 ～</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ delay: 0.8, duration: 1.4, repeat: Infinity }}
          className="mt-6 text-xs text-ink-500"
        >
          加载中
        </motion.div>
      </div>
    </div>
  )
}
