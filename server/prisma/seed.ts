import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 成就
  const achievements = [
    { code: 'first_course', title: '初入书院', description: '保存第一门课程', icon: '🎓', rarity: 'common' },
    { code: 'streak_3', title: '小有恒心', description: '连续打卡 3 天', icon: '🔥', rarity: 'common' },
    { code: 'streak_7', title: '一周坚持', description: '连续打卡 7 天', icon: '🌟', rarity: 'rare' },
    { code: 'streak_30', title: '月度大师', description: '连续打卡 30 天', icon: '🏆', rarity: 'epic' },
    { code: 'study_5h', title: '专注力 +', description: '累计学习 5 小时', icon: '⏳', rarity: 'common' },
    { code: 'rate_10', title: '善于反思', description: '点评 10 门课程', icon: '⭐', rarity: 'rare' },
    { code: 'fav_20', title: '收藏家', description: '收藏 20 门课程', icon: '📚', rarity: 'rare' },
    { code: 'all_subjects', title: '通识达人', description: '跨 5 个学科学习', icon: '🌈', rarity: 'epic' },
    { code: 'night_owl', title: '夜读人', description: '深夜学习一次', icon: '🌙', rarity: 'common' },
    { code: 'early_bird', title: '晨型人', description: '清晨学习一次', icon: '🌅', rarity: 'common' },
    { code: 'panda_friend', title: '熊掌挚友', description: '与书院熊对话 50 条', icon: '🐼', rarity: 'rare' },
    { code: 'first_order', title: '初次购入', description: '完成首单课程/书籍', icon: '🛒', rarity: 'common' },
  ]
  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { code: a.code }, update: {}, create: a })
  }

  // 商品
  const products = [
    {
      title: '《深度学习入门：基于 Python 的理论与实现》',
      cover: 'https://images.weserv.nl/?url=raw.githubusercontent.com/saru2020/study-helper-assets/main/book-dl.jpg',
      description: '日本 AI 学者斋藤康毅经典著作，零基础走进神经网络世界，配套手写代码。',
      price: 8900,
      originalPrice: 12900,
      category: 'book',
      tags: ['深度学习', 'Python', '入门'],
    },
    {
      title: '《算法图解》— 用图示快速掌握常见算法',
      cover: 'https://images.weserv.nl/?url=raw.githubusercontent.com/saru2020/study-helper-assets/main/book-algo.jpg',
      description: 'Aditya Bhargava 经典图解算法，适合面试与日常巩固。',
      price: 4900,
      originalPrice: 6900,
      category: 'book',
      tags: ['算法', '面试', '图解'],
    },
    {
      title: '高数微积分专题刷题营（30 课时）',
      cover: 'https://images.weserv.nl/?url=raw.githubusercontent.com/saru2020/study-helper-assets/main/course-math.jpg',
      description: '考研常考题型 100 例，每节课配套真题与详细板书。',
      price: 19900,
      originalPrice: 29900,
      category: 'course',
      tags: ['高数', '考研', '题型'],
    },
    {
      title: '雅思口语 7 分通关训练营',
      cover: 'https://images.weserv.nl/?url=raw.githubusercontent.com/saru2020/study-helper-assets/main/course-ielts.jpg',
      description: '6 周突破口语瓶颈，每天 30 分钟练习计划 + AI 陪练。',
      price: 39900,
      originalPrice: 59900,
      category: 'course',
      tags: ['雅思', '口语', '英语'],
    },
    {
      title: '日本国誉 Campus 学习笔记本 5 册装',
      cover: 'https://images.weserv.nl/?url=raw.githubusercontent.com/saru2020/study-helper-assets/main/merch-notebook.jpg',
      description: '细线点阵设计，墨水不渗，配套学海小书院学科分隔贴纸。',
      price: 5900,
      originalPrice: 7900,
      category: 'merch',
      tags: ['文具', '笔记本'],
    },
    {
      title: '可爱熊掌护眼台灯（USB 三档色温）',
      cover: 'https://images.weserv.nl/?url=raw.githubusercontent.com/saru2020/study-helper-assets/main/merch-lamp.jpg',
      description: '随书院熊吉祥物造型，无频闪护眼，伴你度过每个学习的夜晚。',
      price: 13900,
      originalPrice: 19900,
      category: 'merch',
      tags: ['护眼', '台灯', '熊掌'],
    },
  ]
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.title.slice(0, 16) },
      update: {},
      create: {
        id: p.title.slice(0, 16),
        title: p.title,
        cover: p.cover,
        description: p.description,
        price: p.price,
        originalPrice: p.originalPrice,
        category: p.category,
        tags: JSON.stringify(p.tags),
        stock: 99,
      },
    })
  }

  // 默认示例课程
  const sample = [
    {
      title: '一节课读懂神经网络的反向传播',
      subtitle: '用最直观的例子拆解链式法则与梯度下降',
      category: 'cs',
      difficulty: 4,
      estimatedHours: 1.5,
      tags: ['深度学习', '反向传播', '入门'],
      objectives: ['能用链式法则手算两层网络的梯度', '理解学习率对训练的影响', '区分梯度消失与梯度爆炸'],
      prerequisites: ['高中导数', 'Python 基础'],
      outline: [
        { title: '从感知机到多层网络', duration: '15 分钟', points: ['前向传播', '激活函数'], tips: ['先在纸上画图再写代码'] },
        { title: '链式法则可视化', duration: '20 分钟', points: ['标量微积分', '雅可比矩阵'], tips: ['用最简单的二元函数练手'] },
        { title: '手动推导一层 BP', duration: '25 分钟', points: ['损失函数', '梯度公式'], tips: ['和自动微分结果对照'] },
        { title: '常见踩坑与改进', duration: '15 分钟', points: ['梯度消失', '初始化技巧'], tips: ['尝试 Xavier 初始化'] },
      ],
      resources: [
        { type: 'book', title: '《深度学习入门》第 5 章', url: '' },
        { type: 'video', title: '3Blue1Brown 神经网络系列', url: 'https://www.3blue1brown.com/topics/neural-networks' },
      ],
    },
    {
      title: '雅思口语 Part1：自我介绍模板与高分句型',
      subtitle: '15 分钟搭建可复用的英语自我介绍框架',
      category: 'english',
      difficulty: 2,
      estimatedHours: 0.5,
      tags: ['雅思', '口语', 'Part1'],
      objectives: ['掌握 5 个高分连接词', '能流畅完成 90 秒自我介绍', '认识 3 个万能话题切换句'],
      prerequisites: ['B1 英语水平'],
      outline: [
        { title: '自我介绍的 4 段式结构', duration: '5 分钟', points: ['身份', '兴趣', '近期目标'], tips: ['先写中文再翻译'] },
        { title: '高分句型与避坑词汇', duration: '5 分钟', points: ['同义替换', '语气连接'], tips: ['录音对照本族者'] },
        { title: '常见尴尬问答演练', duration: '5 分钟', points: ['卡顿急救', '微笑回应'], tips: ['镜子练习 3 次'] },
      ],
      resources: [{ type: 'practice', title: '官方雅思口语题库 2024 春季', url: '' }],
    },
  ]
  for (const s of sample) {
    await prisma.course.upsert({
      where: { id: s.title.slice(0, 14) },
      update: {},
      create: {
        id: s.title.slice(0, 14),
        title: s.title,
        subtitle: s.subtitle,
        category: s.category,
        difficulty: s.difficulty,
        estimatedHours: s.estimatedHours,
        tags: JSON.stringify(s.tags),
        objectives: JSON.stringify(s.objectives),
        prerequisites: JSON.stringify(s.prerequisites),
        outline: JSON.stringify(s.outline),
        resources: JSON.stringify(s.resources),
        isPublic: true,
      },
    })
  }

  console.log('seed done')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
