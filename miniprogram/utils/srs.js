/**
 * SM-2 间隔重复算法（简化版）
 * 基于 SuperMemo SM-2 算法实现
 */

// 等级映射
const LEVEL_MAP = {
  0: '未学',
  1: '初识',
  2: '熟悉',
  3: '掌握',
  4: '熟练',
  5: '精通'
}

const LEVEL_COLORS = {
  0: '#999',
  1: '#f39c12',
  2: '#e67e22',
  3: '#27ae60',
  4: '#2ecc71',
  5: '#1abc9c'
}

/**
 * 根据用户评分更新 SRS 数据
 * @param {Object} srs - 当前的 srs 数据对象
 * @param {number} quality - 评分 0-5（0=完全忘记, 3=困难, 5=轻松）
 * @returns {Object} 更新后的 srs 数据
 */
function review(srs, quality) {
  const newSrs = { ...srs }

  if (quality >= 3) {
    // 回答正确
    newSrs.correctCount++
    if (newSrs.interval === 0) {
      newSrs.interval = 1
    } else if (newSrs.interval === 1) {
      newSrs.interval = 3
    } else {
      newSrs.interval = Math.round(newSrs.interval * newSrs.ease)
    }
    newSrs.level = Math.min(5, newSrs.level + 1)
  } else {
    // 回答错误
    newSrs.incorrectCount++
    newSrs.interval = 0
    newSrs.level = Math.max(0, newSrs.level - 1)
  }

  // 根据质量调整难度系数
  newSrs.ease = Math.max(1.3, newSrs.ease + (0.1 - (5 - quality) * 0.08))
  newSrs.nextReview = Date.now() + newSrs.interval * 86400000
  newSrs.lastReviewed = Date.now()

  return newSrs
}

/**
 * 获取当前需要复习的单词
 * @param {Array} words - 单词列表
 * @param {number} limit - 限制数量
 * @returns {Array} 需要复习的单词列表
 */
function getDueWords(words, limit = 20) {
  const now = Date.now()
  const due = words.filter(w => w.srs.nextReview <= now || w.srs.level === 0)
    .sort((a, b) => {
      // 未学的优先
      if (a.srs.level === 0 && b.srs.level !== 0) return -1
      if (b.srs.level === 0 && a.srs.level !== 0) return 1
      // 按下次复习时间排序
      return a.srs.nextReview - b.srs.nextReview
    })
  return due.slice(0, limit)
}

/**
 * 获取新词（未学过的）
 */
function getNewWords(words, limit = 10) {
  return words.filter(w => w.srs.level === 0).slice(0, limit)
}

/**
 * 获取学习统计
 */
function getWordsStats(words) {
  const total = words.length
  const learned = words.filter(w => w.srs.level > 0).length
  const mastered = words.filter(w => w.srs.level >= 3).length
  const newCount = words.filter(w => w.srs.level === 0).length

  return {
    total,
    learned,
    mastered,
    newCount,
    progress: total > 0 ? Math.round((learned / total) * 100) : 0
  }
}

/**
 * 获取需要复习的数量
 */
function getDueCount(words) {
  return words.filter(w => w.srs.nextReview > 0 && w.srs.nextReview <= Date.now()).length
}

module.exports = {
  review,
  getDueWords,
  getNewWords,
  getWordsStats,
  getDueCount,
  LEVEL_MAP,
  LEVEL_COLORS
}
