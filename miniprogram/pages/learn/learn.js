/**
 * 学习模式 - 卡片式背诵
 * 显示单词 → 点击翻转 → 标记掌握程度
 */
const storage = require('../../utils/storage')
const srsUtil = require('../../utils/srs')

Page({
  data: {
    bookId: '',
    mode: 'learn', // learn: 学新词, review: 复习
    words: [],
    currentIndex: 0,
    currentWord: null,
    isFlipped: false,
    totalCount: 0,
    completedCount: 0,
    isComplete: false,
    stats: { known: 0, unknown: 0, skipped: 0 }
  },

  onLoad(options) {
    this.setData({ bookId: options.bookId, mode: options.mode || 'learn' })
    wx.setNavigationBarTitle({
      title: this.data.mode === 'review' ? '复习模式' : '学习模式'
    })
    this.loadWords()
  },

  loadWords() {
    const allWords = storage.getWords(this.data.bookId)
    let words

    if (this.data.mode === 'review') {
      words = srsUtil.getDueWords(allWords, 20)
    } else {
      words = srsUtil.getNewWords(allWords, 10)
      // 新词不够时补充一些需要复习的
      if (words.length < 5) {
        const due = srsUtil.getDueWords(allWords, 15)
        words = [...words, ...due].slice(0, 15)
      }
    }

    // 打乱顺序
    words.sort(() => Math.random() - 0.5)

    this.setData({
      words,
      totalCount: words.length,
      currentIndex: 0,
      currentWord: words[0] || null,
      isComplete: words.length === 0
    })
  },

  flipCard() {
    this.setData({ isFlipped: !this.data.isFlipped })
  },

  markKnown() {
    this.recordResult(5) // 轻松
  },

  markUnknown() {
    this.recordResult(1) // 忘记
  },

  markHard() {
    this.recordResult(3) // 困难但正确
  },

  recordResult(quality) {
    const { words, currentIndex, stats } = this.data
    const word = words[currentIndex]
    if (!word) return

    // 更新 SRS 数据
    const newSrs = srsUtil.review(word.srs, quality)
    storage.updateWord(this.data.bookId, word.id, { srs: newSrs })

    // 记录学习日志
    storage.logStudy(storage.getTodayKey(), 1)

    // 更新统计
    const newStats = { ...stats }
    if (quality >= 4) newStats.known++
    else if (quality >= 3) newStats.known++
    else newStats.unknown++

    this.setData({ stats: newStats })

    // 下一张
    this.nextCard()
  },

  skipCard() {
    const { stats } = this.data
    this.setData({
      stats: { ...stats, skipped: stats.skipped + 1 }
    })
    this.nextCard()
  },

  nextCard() {
    const nextIndex = this.data.currentIndex + 1
    if (nextIndex >= this.data.words.length) {
      this.setData({
        isComplete: true,
        completedCount: nextIndex
      })
      return
    }

    this.setData({
      currentIndex: nextIndex,
      currentWord: this.data.words[nextIndex],
      isFlipped: false
    })
  },

  restart() {
    this.loadWords()
    this.setData({
      completedCount: 0,
      isComplete: false,
      stats: { known: 0, unknown: 0, skipped: 0 }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
