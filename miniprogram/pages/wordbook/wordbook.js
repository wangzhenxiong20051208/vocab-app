// pages/wordbook/wordbook.js
const storage = require('../../utils/storage')
const srs = require('../../utils/srs')

Page({
  data: {
    book: null,
    bookId: '',
    words: [],
    searchKeyword: '',
    showMenu: false,
    sortBy: 'newest' // newest | alpha | level
  },

  onLoad(options) {
    const bookId = options.id
    this.setData({ bookId })
    this.loadData()
  },

  onShow() {
    if (this.data.bookId) {
      this.loadData()
    }
  },

  loadData() {
    const book = storage.getBook(this.data.bookId)
    const words = storage.getWords(this.data.bookId)
    const stats = srs.getWordsStats(words)
    const dueCount = srs.getDueCount(words)
    this.setData({
      book,
      words: this.sortWords(words),
      stats,
      dueCount
    })
  },

  sortWords(words) {
    const sorted = [...words]
    switch (this.data.sortBy) {
      case 'alpha':
        sorted.sort((a, b) => a.word.localeCompare(b.word))
        break
      case 'level':
        sorted.sort((a, b) => b.srs.level - a.srs.level)
        break
      default: // newest
        sorted.sort((a, b) => b.createdAt - a.createdAt)
    }
    return sorted
  },

  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    if (keyword.trim()) {
      const words = storage.searchWords(this.data.bookId, keyword)
      this.setData({ words })
    } else {
      this.loadData()
    }
  },

  toggleMenu() {
    this.setData({ showMenu: !this.data.showMenu })
  },

  onSortChange(e) {
    const sortBy = e.currentTarget.dataset.sort
    this.setData({ sortBy, showMenu: false })
    this.loadData()
  },

  goToLearn() {
    wx.navigateTo({
      url: `/pages/learn/learn?bookId=${this.data.bookId}`
    })
  },

  goToReview() {
    wx.navigateTo({
      url: `/pages/review/review?bookId=${this.data.bookId}`
    })
  },

  goToSpeak() {
    wx.switchTab({
      url: `/pages/speak/speak?bookId=${this.data.bookId}`
    })
  },

  goToExport() {
    wx.navigateTo({
      url: `/pages/export/export?bookId=${this.data.bookId}`
    })
  },

  goToAddWord() {
    wx.navigateTo({
      url: `/pages/addword/addword?bookId=${this.data.bookId}`
    })
  },

  deleteWord(e) {
    const wordId = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个单词吗？',
      success: (res) => {
        if (res.confirm) {
          storage.deleteWord(this.data.bookId, wordId)
          this.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  editWord(e) {
    const wordId = e.currentTarget.dataset.id
    const word = this.data.words.find(w => w.id === wordId)
    if (word) {
      wx.navigateTo({
        url: `/pages/addword/addword?bookId=${this.data.bookId}&wordId=${wordId}`
      })
    }
  },

  getLevelText(level) {
    return srs.LEVEL_MAP[level] || '未学'
  },

  getLevelColor(level) {
    return srs.LEVEL_COLORS[level] || '#999'
  },

  getLevelBadge(level) {
    const map = {0: '未学', 1: '初识', 2: '熟悉', 3: '掌握', 4: '熟练', 5: '精通'}
    const colors = {0: '#999', 1: '#f39c12', 2: '#e67e22', 3: '#27ae60', 4: '#2ecc71', 5: '#1abc9c'}
    return { text: map[level] || '未学', color: colors[level] || '#999' }
  }
})
