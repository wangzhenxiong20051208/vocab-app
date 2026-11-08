/**
 * 数据存储层 - 封装微信小程序的本地存储
 * 所有数据操作统一走这里，方便日后迁移到云存储
 */

const STORAGE_KEYS = {
  BOOKS: 'wordbooks',
  WORDS_PREFIX: 'words_',
  SETTINGS: 'app_settings',
  STUDY_LOG: 'study_log'
}

// ============ 词本操作 ============

function getBooks() {
  return wx.getStorageSync(STORAGE_KEYS.BOOKS) || []
}

function saveBooks(books) {
  wx.setStorageSync(STORAGE_KEYS.BOOKS, books)
}

function createBook(name) {
  const books = getBooks()
  const book = {
    id: 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    name: name.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    wordCount: 0
  }
  books.unshift(book)
  saveBooks(books)
  // 初始化单词列表
  wx.setStorageSync(STORAGE_KEYS.WORDS_PREFIX + book.id, [])
  return book
}

function deleteBook(bookId) {
  const books = getBooks().filter(b => b.id !== bookId)
  saveBooks(books)
  // 清除单词数据
  wx.removeStorageSync(STORAGE_KEYS.WORDS_PREFIX + bookId)
}

function renameBook(bookId, newName) {
  const books = getBooks()
  const book = books.find(b => b.id === bookId)
  if (book) {
    book.name = newName.trim()
    book.updatedAt = Date.now()
    saveBooks(books)
  }
  return book
}

function getBook(bookId) {
  return getBooks().find(b => b.id === bookId) || null
}

// ============ 单词操作 ============

function getWords(bookId) {
  return wx.getStorageSync(STORAGE_KEYS.WORDS_PREFIX + bookId) || []
}

function saveWords(bookId, words) {
  wx.setStorageSync(STORAGE_KEYS.WORDS_PREFIX + bookId, words)
  // 更新词本单词数
  const books = getBooks()
  const book = books.find(b => b.id === bookId)
  if (book) {
    book.wordCount = words.length
    book.updatedAt = Date.now()
    saveBooks(books)
  }
}

function addWord(bookId, word, meaning, example = '') {
  const words = getWords(bookId)
  // 检查重复
  const exists = words.some(w => w.word.toLowerCase() === word.toLowerCase())
  if (exists) {
    return { success: false, error: '该单词已存在' }
  }
  const newWord = {
    id: 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    word: word.trim(),
    meaning: meaning.trim(),
    example: example.trim(),
    createdAt: Date.now(),
    // SRS 学习数据
    srs: {
      level: 0,          // 0=未学, 1-5=掌握程度
      nextReview: 0,     // 下次复习时间戳
      interval: 0,       // 当前间隔（天）
      ease: 2.5,         // 难度系数
      correctCount: 0,   // 正确次数
      incorrectCount: 0, // 错误次数
      lastReviewed: 0    // 上次复习时间
    }
  }
  words.push(newWord)
  saveWords(bookId, words)
  return { success: true, word: newWord }
}

function deleteWord(bookId, wordId) {
  const words = getWords(bookId).filter(w => w.id !== wordId)
  saveWords(bookId, words)
}

function updateWord(bookId, wordId, updates) {
  const words = getWords(bookId)
  const word = words.find(w => w.id === wordId)
  if (word) {
    Object.assign(word, updates)
    saveWords(bookId, words)
  }
  return word
}

function batchAddWords(bookId, wordList) {
  // wordList: [{ word, meaning, example }]
  const words = getWords(bookId)
  let added = 0
  let skipped = 0

  wordList.forEach(item => {
    if (!item.word || !item.meaning) return
    const exists = words.some(w => w.word.toLowerCase() === item.word.toLowerCase())
    if (!exists) {
      words.push({
        id: 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        word: item.word.trim(),
        meaning: item.meaning.trim(),
        example: (item.example || '').trim(),
        createdAt: Date.now(),
        srs: {
          level: 0, nextReview: 0, interval: 0,
          ease: 2.5, correctCount: 0, incorrectCount: 0, lastReviewed: 0
        }
      })
      added++
    } else {
      skipped++
    }
  })

  saveWords(bookId, words)
  return { added, skipped, total: words.length }
}

function searchWords(bookId, keyword) {
  const words = getWords(bookId)
  if (!keyword.trim()) return words
  const kw = keyword.toLowerCase()
  return words.filter(w =>
    w.word.toLowerCase().includes(kw) ||
    w.meaning.includes(keyword)
  )
}

// ============ 设置 ============

function getSetting(key, defaultValue) {
  const settings = wx.getStorageSync(STORAGE_KEYS.SETTINGS) || {}
  return settings[key] !== undefined ? settings[key] : defaultValue
}

function setSetting(key, value) {
  const settings = wx.getStorageSync(STORAGE_KEYS.SETTINGS) || {}
  settings[key] = value
  wx.setStorageSync(STORAGE_KEYS.SETTINGS, settings)
}

function getAllSettings() {
  return wx.getStorageSync(STORAGE_KEYS.SETTINGS) || {}
}

// ============ 学习记录 ============

function getStudyLog() {
  return wx.getStorageSync(STORAGE_KEYS.STUDY_LOG) || {}
}

function logStudy(dateStr, count) {
  const log = getStudyLog()
  if (!log[dateStr]) {
    log[dateStr] = { learned: 0, reviewed: 0 }
  }
  log[dateStr].reviewed += count
  log[dateStr].learned += count
  wx.setStorageSync(STORAGE_KEYS.STUDY_LOG, log)
}

function getStudyStats(days = 30) {
  const log = getStudyLog()
  const today = new Date()
  const stats = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = formatDate(d)
    stats.push({
      date: key,
      count: log[key] ? log[key].reviewed : 0,
      isToday: i === 0
    })
  }
  return stats
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getTodayKey() {
  return formatDate(new Date())
}

// 获取连续打卡天数
function getStreakDays() {
  const log = getStudyLog()
  const dates = Object.keys(log).sort().reverse()
  let streak = 0
  const today = new Date()

  for (let i = 0; i < dates.length; i++) {
    const d = new Date(dates[i])
    const expected = new Date(today)
    expected.setDate(expected.getDate() - i)

    if (formatDate(d) === formatDate(expected)) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// ============ 导入导出 ============

function exportAsJson(bookId) {
  const book = getBook(bookId)
  const words = getWords(bookId)
  if (!book) return null
  return {
    bookName: book.name,
    exportedAt: new Date().toISOString(),
    words: words.map(w => ({
      word: w.word,
      meaning: w.meaning,
      example: w.example,
      level: w.srs.level
    }))
  }
}

function exportAsText(bookId) {
  const words = getWords(bookId)
  return words.map(w => `${w.word}\t${w.meaning}${w.example ? '\t' + w.example : ''}`).join('\n')
}

function exportAsCsv(bookId) {
  const words = getWords(bookId)
  let csv = '单词,释义,例句,掌握程度\n'
  const levelMap = { 0: '未学', 1: '初识', 2: '熟悉', 3: '掌握', 4: '熟练', 5: '精通' }
  words.forEach(w => {
    const example = (w.example || '').replace(/"/g, '""')
    const meaning = w.meaning.replace(/"/g, '""')
    csv += `"${w.word}","${meaning}","${example}","${levelMap[w.srs.level] || '未学'}"\n`
  })
  return csv
}

// 从文本导入（格式: word - meaning 或 word\\tmeaning）
function importFromText(bookId, text) {
  const lines = text.split('\n').filter(l => l.trim())
  const wordList = []

  lines.forEach(line => {
    line = line.trim()
    // 尝试多种分隔符
    let parts = null
    if (line.includes('\t')) {
      parts = line.split('\t')
    } else if (line.includes(' - ')) {
      parts = line.split(' - ')
    } else if (line.includes('：')) {
      parts = line.split('：')
    } else if (line.includes(':')) {
      parts = line.split(':')
    }

    if (parts && parts.length >= 2) {
      wordList.push({
        word: parts[0].trim(),
        meaning: parts[1].trim(),
        example: parts[2] ? parts[2].trim() : ''
      })
    } else if (line) {
      // 单行只有一个词，释义留空
      wordList.push({ word: line, meaning: '', example: '' })
    }
  })

  return batchAddWords(bookId, wordList)
}

module.exports = {
  // 词本
  getBooks,
  saveBooks,
  createBook,
  deleteBook,
  renameBook,
  getBook,
  // 单词
  getWords,
  saveWords,
  addWord,
  deleteWord,
  updateWord,
  batchAddWords,
  searchWords,
  // 设置
  getSetting,
  setSetting,
  getAllSettings,
  // 学习记录
  getStudyLog,
  logStudy,
  getStudyStats,
  getStraekDays: getStreakDays,
  getStreakDays: getStreakDays,
  formatDate,
  getTodayKey,
  // 导入导出
  exportAsJson,
  exportAsText,
  exportAsCsv,
  importFromText
}
