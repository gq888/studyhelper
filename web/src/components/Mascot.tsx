import { motion } from 'framer-motion'

interface MascotProps {
  size?: number
  mood?: 'happy' | 'reading' | 'cooking' | 'thinking'
  bobbing?: boolean
}

/**
 * 「书院鸮」吉祥物 - 内嵌 SVG（猫头鹰），避免外部图片依赖。
 * 配色：棕褐身体 + 米黄胸腹 + 橙喙 + 学士帽。
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
      {/* 身体（圆胖椭圆） */}
      <ellipse cx="100" cy="118" rx="62" ry="60" fill="#a98064" stroke="#1f1d1c" strokeWidth="3" />
      {/* 胸腹米黄色面板（猫头鹰特征） */}
      <ellipse cx="100" cy="128" rx="42" ry="46" fill="#fde7c0" />
      {/* 胸腹纹理：几道短弧 */}
      <path d="M 80 140 Q 100 134 120 140" stroke="#caa676" strokeWidth="1.6" fill="none" />
      <path d="M 78 152 Q 100 146 122 152" stroke="#caa676" strokeWidth="1.6" fill="none" />
      <path d="M 82 162 Q 100 156 118 162" stroke="#caa676" strokeWidth="1.6" fill="none" />
      {/* 翅膀（左右两片） */}
      <path d="M 44 110 Q 30 130 48 162 Q 60 152 64 130 Z" fill="#8a6047" stroke="#1f1d1c" strokeWidth="2.4" />
      <path d="M 156 110 Q 170 130 152 162 Q 140 152 136 130 Z" fill="#8a6047" stroke="#1f1d1c" strokeWidth="2.4" />
      {/* 头部羽冠（两个小尖） */}
      <path d="M 64 64 L 70 50 L 78 66 Z" fill="#a98064" stroke="#1f1d1c" strokeWidth="2.4" />
      <path d="M 136 64 L 130 50 L 122 66 Z" fill="#a98064" stroke="#1f1d1c" strokeWidth="2.4" />
      {/* 眼盘（猫头鹰特有的圆盘脸） */}
      <ellipse cx="74" cy="92" rx="26" ry="28" fill="#fff8ec" stroke="#1f1d1c" strokeWidth="2.6" />
      <ellipse cx="126" cy="92" rx="26" ry="28" fill="#fff8ec" stroke="#1f1d1c" strokeWidth="2.6" />
      {/* 眼睛（大黑圆 + 高光） */}
      <circle cx="74" cy="92" r="13" fill="#1f1d1c" />
      <circle cx="126" cy="92" r="13" fill="#1f1d1c" />
      <circle cx="79" cy="87" r="4" fill="#fff" />
      <circle cx="131" cy="87" r="4" fill="#fff" />
      <circle cx="71" cy="96" r="1.6" fill="#fff" />
      <circle cx="123" cy="96" r="1.6" fill="#fff" />
      {/* 喙（V 形橙色） */}
      <path d="M 92 112 L 100 124 L 108 112 Z" fill="#f97316" stroke="#1f1d1c" strokeWidth="2" strokeLinejoin="round" />
      {/* 腮红 */}
      <circle cx="56" cy="118" r="6" fill="#fdba74" opacity="0.6" />
      <circle cx="144" cy="118" r="6" fill="#fdba74" opacity="0.6" />
      {/* 两只小脚 */}
      <path d="M 84 174 L 84 182 M 80 182 L 88 182" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
      <path d="M 116 174 L 116 182 M 112 182 L 120 182" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
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
          <circle cx="160" cy="56" r="6" fill="#fffdf8" stroke="#1f1d1c" strokeWidth="2" />
          <circle cx="172" cy="44" r="9" fill="#fffdf8" stroke="#1f1d1c" strokeWidth="2" />
          <text x="168" y="48" fontSize="12" fill="#1f1d1c" fontWeight="bold">?</text>
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
