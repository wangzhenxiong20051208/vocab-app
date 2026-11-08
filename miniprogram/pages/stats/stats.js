/**
 * 学习统计页面
 * 展示学习打卡日历、掌握程度统计等
 */
const storage = require('../../utils/storage')
const srsUtil = require('../../utils/srs')

Page({
  data: {
    // 总览
    totalWords: 0,
    totalLearned: 0,
    totalMastered: 0,
    streakDays: 0,
    // 词本统计
    bookStats: [],
    // 日历数据
    calendarData: [],
    calendarYear: 0,
    calendarMonth: 0,
    monthLabel: '',
    // 掌握程度分布
    levelDistribution: []
  },

  onShow() {
    this.loadStats()
  },

  loadStats() {
    const books = storage.getBooks()
    let totalWords = 0
    let totalLearned = 0
    let totalMastered = 0
    const bookStats = []

    books.forEach(book => {
      const words = storage.getWords(book.id)
      const stats = srsUtil.getWordsStats(words)
      totalWords += stats.total
      totalLearned += stats.learned
      totalMastered += stats.mastered

      bookStats.push({
        name: book.name,
        total: stats.total,
        learned: stats.learned,
        mastered: stats.mastered,
        progress: stats.progress
      })
    })

    const streakDays = storage.getStraekDays ? storage.getStraekDays() : 0
    const now = new Date()

    this.setData({
      totalWords,
      totalLearned,
      totalMastered,
      streakDays,
      bookStats,
      calendarYear: now.getFullYear(),
      calendarMonth: now.getMonth() + 1,
      monthLabel: `${now.getFullYear()}年${now.getMonth() + 1}月`
    })

    this.buildCalendar()
    this.buildLevelDistribution(books)
  },

  // ======== 日历 ========

  buildCalendar() {
    const { calendarYear, calendarMonth } = this.data
    const studyLog = storage.getStudyLog()

    // 当月第一天
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay()
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate()

    const days = []

    // 前面补全空白
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true })
    }

    // 当月天数
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const today = storage.formatDate(new Date())
      days.push({
        day: d,
        dateKey,
        studied: !!studyLog[dateKey],
        count: studyLog[dateKey] ? studyLog[dateKey].reviewed : 0,
        isToday: dateKey === today
      })
    }

    this.setData({ calendarData: days })
  },

  prevMonth() {
    let { calendarYear, calendarMonth } = this.data
    calendarMonth--
    if (calendarMonth < 1) {
      calendarMonth = 12
      calendarYear--
    }
    this.setData({
      calendarYear,
      calendarMonth,
      monthLabel: `${calendarYear}年${calendarMonth}月`
    })
    this.buildCalendar()
  },

  nextMonth() {
    let { calendarYear, calendarMonth } = this.data
    calendarMonth++
    if (calendarMonth > 12) {
      calendarMonth = 1
      calendarYear++
    }
    this.setData({
      calendarYear,
      calendarMonth,
      monthLabel: `${calendarYear}年${calendarMonth}月`
    })
    this.buildCalendar()
  },

  // ======== 掌握程度分布 ========

  buildLevelDistribution(books) {
    const levels = [0, 1, 2, 3, 4, 5]
    const distribution = levels.map(level => {
      let count = 0
      books.forEach(book => {
        const words = storage.getWords(book.id)
        count += words.filter(w => w.srs.level === level).length
      })
      return {
        level,
        label: srsUtil.LEVEL_MAP[level],
        count,
        color: srsUtil.LEVEL_COLORS[level]
      }
    })

    this.setData({ levelDistribution: distribution })
  },

  // ======== 工具 ========

  getLevelColor(level) {
    return srsUtil.LEVEL_COLORS[level] || '#999'
  }
})
