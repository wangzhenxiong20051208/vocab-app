// pages/addword/addword.js
const storage = require('../../utils/storage')

Page({
  data: {
    bookId: '',
    wordId: '',
    isEdit: false,
    word: '',
    meaning: '',
    example: '',
    // 批量导入
    batchText: '',
    showBatch: false,
    // 解析预览
    parsedCount: 0
  },

  onLoad(options) {
    this.setData({ bookId: options.bookId })

    if (options.wordId) {
      // 编辑模式
      const words = storage.getWords(options.bookId)
      const word = words.find(w => w.id === options.wordId)
      if (word) {
        this.setData({
          wordId: options.wordId,
          isEdit: true,
          word: word.word,
          meaning: word.meaning,
          example: word.example
        })
        wx.setNavigationBarTitle({ title: '编辑单词' })
      }
    }
  },

  onWordInput(e) { this.setData({ word: e.detail.value }) },
  onMeaningInput(e) { this.setData({ meaning: e.detail.value }) },
  onExampleInput(e) { this.setData({ example: e.detail.value }) },

  saveWord() {
    const { bookId, wordId, isEdit, word, meaning, example } = this.data

    if (!word.trim()) {
      wx.showToast({ title: '请输入单词', icon: 'none' })
      return
    }
    if (!meaning.trim()) {
      wx.showToast({ title: '请输入释义', icon: 'none' })
      return
    }

    if (isEdit) {
      storage.updateWord(bookId, wordId, {
        word: word.trim(),
        meaning: meaning.trim(),
        example: example.trim()
      })
      wx.showToast({ title: '已更新', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } else {
      const result = storage.addWord(bookId, word, meaning, example)
      if (result.success) {
        wx.showToast({ title: '已添加', icon: 'success' })
        this.setData({ word: '', meaning: '', example: '' })
      } else {
        wx.showToast({ title: result.error || '添加失败', icon: 'none' })
      }
    }
  },

  // ===== 批量导入 =====

  toggleBatch() {
    this.setData({ showBatch: !this.data.showBatch, batchText: '' })
  },

  onBatchInput(e) {
    this.setData({ batchText: e.detail.value })
  },

  previewBatch() {
    const text = this.data.batchText.trim()
    if (!text) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    // 简单解析
    const lines = text.split('\n').filter(l => l.trim())
    this.setData({ parsedCount: lines.length })

    wx.showModal({
      title: '预览',
      content: `检测到 ${lines.length} 行，确认导入吗？`,
      success: (res) => {
        if (res.confirm) this.doBatchImport()
      }
    })
  },

  doBatchImport() {
    const result = storage.importFromText(this.data.bookId, this.data.batchText)
    wx.showToast({
      title: `导入完成：新增 ${result.added}，跳过 ${result.skipped}`,
      icon: 'success',
      duration: 2000
    })
    this.setData({
      showBatch: false,
      batchText: '',
      word: '',
      meaning: '',
      example: ''
    })
  }
})
