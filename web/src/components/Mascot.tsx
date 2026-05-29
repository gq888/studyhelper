import { motion } from 'framer-motion'

interface MascotProps {
  size?: number
  mood?: 'happy' | 'reading' | 'cooking' | 'thinking'
  bobbing?: boolean
}

/**
 * 「书院熊」吉祥物 - 内嵌 SVG，避免外部图片依赖
 */
export function Mascot({ size = 96, mood = 'happy', bobbing = false }: MascotProps) {
  const Body = (
    <svg viewBox="0 0 200 200" width={size} height={size} className="select-none drop-shadow-md">
      {/* 学士帽 */}
      <g transform="translate(40,4)">
        <rect x="0" y="14" width="120" height="6" rx="2" fill="#3a3735" />
        <polygon points="60,0 120,12 60,24 0,12" fill="#3a3735" />
        <line x1="115" y1="14" x2="125" y2="40" stroke="#3a3735" strokeWidth="3" />
        <circle cx="125" cy="42" r="5" fill="#f97316" />
      </g>
      {/* 头 */}
      <ellipse cx="100" cy="105" rx="62" ry="58" fill="#fff" stroke="#1f1d1c" strokeWidth="3" />
      {/* 耳朵 */}
      <ellipse cx="48" cy="58" rx="16" ry="18" fill="#1f1d1c" />
      <ellipse cx="152" cy="58" rx="16" ry="18" fill="#1f1d1c" />
      <ellipse cx="48" cy="60" rx="9" ry="11" fill="#3a3735" />
      <ellipse cx="152" cy="60" rx="9" ry="11" fill="#3a3735" />
      {/* 眼周 */}
      <ellipse cx="74" cy="98" rx="16" ry="20" fill="#1f1d1c" transform="rotate(-8 74 98)" />
      <ellipse cx="126" cy="98" rx="16" ry="20" fill="#1f1d1c" transform="rotate(8 126 98)" />
      {/* 眼睛高光 */}
      <circle cx="76" cy="99" r="5" fill="#fff" />
      <circle cx="124" cy="99" r="5" fill="#fff" />
      <circle cx="78" cy="100" r="1.6" fill="#1f1d1c" />
      <circle cx="122" cy="100" r="1.6" fill="#1f1d1c" />
      {/* 鼻子 */}
      <ellipse cx="100" cy="118" rx="6" ry="4" fill="#1f1d1c" />
      {/* 嘴 */}
      <path d="M 92 128 Q 100 135 108 128" stroke="#1f1d1c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* 腮红 */}
      <circle cx="62" cy="125" r="7" fill="#fdba74" opacity="0.55" />
      <circle cx="138" cy="125" r="7" fill="#fdba74" opacity="0.55" />
      {/* 道具：读书 / 思考 */}
      {mood === 'reading' && (
        <g transform="translate(60,148)">
          <rect x="0" y="0" width="80" height="32" rx="3" fill="#fff" stroke="#1f1d1c" strokeWidth="2.4" />
          <line x1="40" y1="2" x2="40" y2="30" stroke="#1f1d1c" strokeWidth="2" />
          <line x1="6" y1="10" x2="34" y2="10" stroke="#7a736e" strokeWidth="1.5" />
          <line x1="6" y1="18" x2="34" y2="18" stroke="#7a736e" strokeWidth="1.5" />
          <line x1="46" y1="10" x2="74" y2="10" stroke="#7a736e" strokeWidth="1.5" />
          <line x1="46" y1="18" x2="74" y2="18" stroke="#7a736e" strokeWidth="1.5" />
        </g>
      )}
      {mood === 'thinking' && (
        <g>
          <circle cx="158" cy="56" r="6" fill="#fffdf8" stroke="#1f1d1c" strokeWidth="2" />
          <circle cx="170" cy="44" r="9" fill="#fffdf8" stroke="#1f1d1c" strokeWidth="2" />
          <text x="166" y="48" fontSize="12" fill="#1f1d1c" fontWeight="bold">?</text>
        </g>
      )}
    </svg>
  )
  if (!bobbing) return Body
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {Body}
    </motion.div>
  )
}
