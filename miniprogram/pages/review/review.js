const storage = require('../../utils/storage')
const srsUtil = require('../../utils/srs')

Page({
  data: {
    bookId: '',
    words: [],
    currentIndex: 0,
    currentWordText: '',
    progressPercent: 0,
    scorePercent: 0,
    optionItems: [],
    totalCount: 0,
    correctCount: 0,
    isComplete: false
  },

  onLoad(options) {
    this.setData({ bookId: options.bookId })
    this.loadQuestions()
  },

  loadQuestions() {
    const allWords = storage.getWords(this.data.bookId)
    if (allWords.length < 4) {
      wx.showToast({ title: '至少需要4个单词', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    const shuffled = [...allWords].sort(() => Math.random() - 0.5)
    this.setData({
      words: shuffled,
      totalCount: Math.min(shuffled.length, 20),
      correctCount: 0,
      currentIndex: 0
    })
    this.nextQuestion()
  },

  nextQuestion() {
    const { words, currentIndex, totalCount, correctCount } = this.data
    if (currentIndex >= totalCount) {
      this.setData({
        isComplete: true,
        scorePercent: totalCount > 0 ? Math.round(correctCount / totalCount * 100) : 0
      })
      return
    }

    const word = words[currentIndex]
    const others = words.filter(w => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    const rawOptions = [{
      text: word.meaning,
      isCorrect: true
    }, ...others.map(o => ({
      text: o.meaning,
      isCorrect: false
    }))].sort(() => Math.random() - 0.5)

    // 初始化选项显示数据
    const optionItems = rawOptions.map(o => ({
      text: o.text,
      isCorrect: o.isCorrect,
      icon: '',
      showIcon: false
    }))

    this.setData({
      currentWordText: word.word,
      optionItems,
      progressPercent: totalCount > 0 ? Math.round(currentIndex / totalCount * 100) : 0
    })
  },

  selectOption(e) {
    const index = e.currentTarget.dataset.index
    const { optionItems, currentWord, correctCount, totalCount, currentIndex } = this.data

    // 防止重复点击
    if (optionItems[index].showIcon) return

    const isCorrect = optionItems[index].isCorrect

    // 更新选项图标
    const updatedItems = optionItems.map((item, i) => {
      const showIcon = item.isCorrect || (i === index)
      return {
        ...item,
        icon: item.isCorrect ? '✓' : (i === index ? '✕' : ''),
        showIcon
      }
    })

    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount

    this.setData({
      optionItems: updatedItems,
      correctCount: newCorrectCount,
      // 更新 SRS
      currentWord: currentWord
    })

    // 更新 SRS（需要从原始数据取）
    const word = this.data.words[currentIndex]
    if (word) {
      const quality = isCorrect ? 5 : 1
      const newSrs = srsUtil.review(word.srs, quality)
      storage.updateWord(this.data.bookId, word.id, { srs: newSrs })
      storage.logStudy(storage.getTodayKey(), 1)
    }

    // 自动下一题
    setTimeout(() => {
      this.setData({ currentIndex: currentIndex + 1 })
      this.nextQuestion()
    }, 1500)
  },

  getOptionClass(index) {
    const item = this.data.optionItems[index]
    if (!item || !item.showIcon) return ''
    if (item.isCorrect) return 'correct'
    return 'wrong'
  },

  restart() {
    this.setData({
      currentIndex: 0,
      correctCount: 0,
      isComplete: false
    })
    this.loadQuestions()
  },

  goBack() {
    wx.navigateBack()
  }
})
