/**
 * 连续朗读模式（地铁场景）
 * 从词本中取出单词，逐个朗读：单词 → 停顿 → 释义 → 停顿 → 下一个
 * 支持后台播放、语速调节、循环模式、定时停止
 */
const storage = require('../../utils/storage')
const srsUtil = require('../../utils/srs')

// 播放状态
const STATE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LOADING: 'loading'
}

Page({
  data: {
    // 词本选择
    books: [],
    selectedBookId: '',
    selectedBookName: '选择词本',
    // 朗读模式
    wordList: [],
    currentIndex: 0,
    currentWord: null,
    showMeaning: false,
    // 播放状态
    playState: STATE.IDLE,
    stateText: '选择词本，开始听词',
    // 控制
    speed: 1.0,
    speedOptions: ['0.75x', '1.0x', '1.25x', '1.5x'],
    speedIndex: 1,
    loopMode: 'list', // list: 列表循环, single: 单曲循环, none: 播完停止
    loopText: '列表循环',
    // 定时
    timerMinutes: 0,
    timerOptions: ['不限', '5分钟', '10分钟', '15分钟', '30分钟'],
    timerIndex: 0,
    remainingSeconds: 0,
    timerEnd: 0,
    // 播放进度
    progress: 0,
    totalWords: 0,
    // 显示设置
    showSettings: false,
    showBookPicker: false,
    // 朗读内容类型
    readMode: 'word+meaning', // word, meaning, both
    readModeText: '单词+释义'
  },

  // 内部变量（不绑定到视图）
  _audioContext: null,
  _timerInterval: null,
  _queueTimer: null,
  _isSpeaking: false,
  _isDestroyed: false,

  onLoad(options) {
    this.loadBooks()

    // 从词本页跳转过来时带上词本ID
    if (options.bookId) {
      this.selectBook(options.bookId)
    }

    // 初始化音频上下文
    this._audioContext = wx.createInnerAudioContext()
    this._audioContext.onError((err) => {
      console.error('Audio error:', err)
      wx.showToast({ title: '音频播放失败', icon: 'none' })
    })

    // 从设置恢复上次的选择
    const lastBookId = storage.getSetting('speak_lastBookId', '')
    const lastSpeed = storage.getSetting('speak_speed', 1.0)
    const lastLoop = storage.getSetting('speak_loopMode', 'list')
    const lastReadMode = storage.getSetting('speak_readMode', 'word+meaning')

    this.setData({
      speed: lastSpeed,
      loopMode: lastLoop,
      readMode: lastReadMode,
      speedIndex: this.data.speedOptions.findIndex(o => parseFloat(o) === lastSpeed) || 1,
      readModeText: this.getReadModeText(lastReadMode),
      loopText: this.getLoopText(lastLoop)
    })
  },

  onUnload() {
    this._isDestroyed = true
    this.stopPlayback()
    if (this._audioContext) {
      this._audioContext.destroy()
      this._audioContext = null
    }
  },

  loadBooks() {
    const books = storage.getBooks()
    this.setData({ books })
    if (books.length > 0 && !this.data.selectedBookId) {
      this.setData({
        selectedBookId: books[0].id,
        selectedBookName: books[0].name
      })
    }
  },

  showBookPicker() {
    this.setData({ showBookPicker: true })
  },

  hideBookPicker() {
    this.setData({ showBookPicker: false })
  },

  onSelectBook(e) {
    const bookId = e.currentTarget.dataset.id
    this.selectBook(bookId)
    this.hideBookPicker()
  },

  selectBook(bookId) {
    const book = storage.getBook(bookId)
    if (!book) return

    const words = storage.getWords(bookId)
    this.setData({
      selectedBookId: bookId,
      selectedBookName: book.name,
      wordList: words,
      totalWords: words.length,
      currentIndex: 0,
      currentWord: words.length > 0 ? words[0] : null,
      showMeaning: false,
      progress: 0,
      playState: STATE.IDLE,
      stateText: words.length > 0 ? '准备就绪，点击播放' : '词本为空'
    })

    storage.setSetting('speak_lastBookId', bookId)
    this.stopPlayback()
  },

  // ======== 播放控制 ========

  togglePlay() {
    if (this.data.playState === STATE.PLAYING) {
      this.pause()
    } else if (this.data.playState === STATE.PAUSED) {
      this.resume()
    } else {
      this.start()
    }
  },

  start() {
    if (this.data.wordList.length === 0) {
      wx.showToast({ title: '词本为空', icon: 'none' })
      return
    }

    this.setData({
      playState: STATE.PLAYING,
      stateText: '正在朗读...',
      currentIndex: 0,
      showMeaning: false
    })

    // 设置定时器
    if (this.data.timerIndex > 0) {
      const minutes = [0, 5, 10, 15, 30][this.data.timerIndex]
      this.setData({
        remainingSeconds: minutes * 60,
        timerEnd: Date.now() + minutes * 60000
      })
      this._timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((this.data.timerEnd - Date.now()) / 1000))
        if (remaining <= 0) {
          this.stopPlayback()
          wx.showToast({ title: '定时结束', icon: 'none' })
          return
        }
        this.setData({ remainingSeconds: remaining })
      }, 1000)
    }

    this.speakCurrent()
  },

  pause() {
    this.setData({
      playState: STATE.PAUSED,
      stateText: '已暂停'
    })
    if (this._audioContext) {
      this._audioContext.pause()
    }
    clearTimeout(this._queueTimer)
  },

  resume() {
    this.setData({
      playState: STATE.PLAYING,
      stateText: '正在朗读...'
    })
    this.speakCurrent()
  },

  stopPlayback() {
    this.setData({
      playState: STATE.IDLE,
      stateText: '已停止',
      showMeaning: false
    })
    if (this._audioContext) {
      this._audioContext.stop()
    }
    clearTimeout(this._queueTimer)
    clearInterval(this._timerInterval)
    this._isSpeaking = false
  },

  next() {
    if (this.data.currentIndex < this.data.wordList.length - 1) {
      this.setData({
        currentIndex: this.data.currentIndex + 1,
        showMeaning: false
      })
      this.updateProgress()
      this.stopCurrentAndSpeak()
    } else if (this.data.loopMode === 'list') {
      // 列表循环回到开头
      this.setData({
        currentIndex: 0,
        showMeaning: false
      })
      this.updateProgress()
      this.stopCurrentAndSpeak()
    } else {
      // 播完停止
      this.stopPlayback()
      this.setData({
        stateText: '全部播完',
        playState: STATE.IDLE
      })
      wx.showToast({ title: '全部播完', icon: 'none' })
    }
  },

  prev() {
    if (this.data.currentIndex > 0) {
      this.setData({
        currentIndex: this.data.currentIndex - 1,
        showMeaning: false
      })
      this.updateProgress()
      this.stopCurrentAndSpeak()
    }
  },

  stopCurrentAndSpeak() {
    if (this._audioContext) {
      this._audioContext.stop()
    }
    clearTimeout(this._queueTimer)
    this._isSpeaking = false
    this.speakCurrent()
  },

  // ======== 朗读引擎 ========

  speakCurrent() {
    if (this._isDestroyed || this.data.playState !== STATE.PLAYING) return
    if (!this.data.wordList[this.data.currentIndex]) return

    const word = this.data.wordList[this.data.currentIndex]
    this.setData({ currentWord: word })

    this._isSpeaking = true

    // Step 1: 朗读单词
    this.speakText(word.word, () => {
      if (this._isDestroyed || this.data.playState !== STATE.PLAYING) return

      // 短暂停顿
      setTimeout(() => {
        if (this._isDestroyed || this.data.playState !== STATE.PLAYING) return

        this.setData({ showMeaning: true })

        // Step 2: 朗读释义
        if (this.data.readMode === 'word+meaning' || this.data.readMode === 'meaning') {
          this.speakText(word.meaning, () => {
            if (this._isDestroyed || this.data.playState !== STATE.PLAYING) return

            // 读例句（如果有）
            if (word.example) {
              setTimeout(() => {
                if (this._isDestroyed || this.data.playState !== STATE.PLAYING) return
                this.speakText(word.example, () => {
                  this.afterWordDone()
                })
              }, 300)
            } else {
              this.afterWordDone()
            }
          })
        } else {
          this.afterWordDone()
        }
      }, 400)
    })
  },

  speakText(text, callback) {
    if (!text || !this._audioContext) {
      callback && callback()
      return
    }

    // 使用 TTS 云函数生成语音
    wx.cloud.callFunction({
      name: 'tts',
      data: {
        text: text,
        speed: this.data.speed
      },
      success: (res) => {
        if (res.result && res.result.audioUrl) {
          this._audioContext.src = res.result.audioUrl
          this._audioContext.play()
          this._audioContext.onEnded(() => {
            callback && callback()
          })
        } else {
          // TTS 失败，尝试控制台显示
          console.log('TTS text:', text)
          callback && callback()
        }
      },
      fail: (err) => {
        console.error('TTS failed:', err)
        // 降级：使用内置语音合成（仅限部分设备）
        this.speakFallback(text, callback)
      }
    })
  },

  speakFallback(text, callback) {
    // 降级方案：使用 Web Speech API（小程序不支持）
    // 直接回调，显示文本（用户可看到文字自行跟读）
    console.log('Speak:', text)

    // 用定时器模拟朗读时长
    const duration = Math.max(500, text.length * 100)
    setTimeout(() => {
      callback && callback()
    }, duration)
  },

  afterWordDone() {
    this._isSpeaking = false
    if (this._isDestroyed || this.data.playState !== STATE.PLAYING) return

    this.setData({ showMeaning: false })

    // 间隔后播下一个
    const delay = this.data.loopMode === 'single' ? 500 : 1000
    this._queueTimer = setTimeout(() => {
      if (this.data.loopMode === 'single') {
        // 单曲循环：重播当前
        this.speakCurrent()
      } else {
        this.next()
      }
    }, delay)
  },

  updateProgress() {
    if (this.data.totalWords > 0) {
      this.setData({
        progress: Math.round((this.data.currentIndex / this.data.totalWords) * 100)
      })
    }
  },

  // ======== 控制面板 ========

  toggleSettings() {
    this.setData({ showSettings: !this.data.showSettings })
  },

  // 语速
  changeSpeed() {
    const idx = (this.data.speedIndex + 1) % this.data.speedOptions.length
    const speed = parseFloat(this.data.speedOptions[idx])
    this.setData({
      speedIndex: idx,
      speed: speed
    })
    storage.setSetting('speak_speed', speed)
  },

  // 循环模式
  changeLoop() {
    const modes = ['list', 'single', 'none']
    const currentIdx = modes.indexOf(this.data.loopMode)
    const nextIdx = (currentIdx + 1) % modes.length
    const nextMode = modes[nextIdx]
    this.setData({
      loopMode: nextMode,
      loopText: this.getLoopText(nextMode)
    })
    storage.setSetting('speak_loopMode', nextMode)
  },

  getLoopText(mode) {
    return { list: '列表循环', single: '单曲循环', none: '播完停止' }[mode] || '列表循环'
  },

  // 朗读模式
  changeReadMode() {
    const modes = ['word+meaning', 'word', 'meaning']
    const currentIdx = modes.indexOf(this.data.readMode)
    const nextIdx = (currentIdx + 1) % modes.length
    const nextMode = modes[nextIdx]
    this.setData({
      readMode: nextMode,
      readModeText: this.getReadModeText(nextMode)
    })
    storage.setSetting('speak_readMode', nextMode)
  },

  getReadModeText(mode) {
    return {
      'word+meaning': '单词+释义',
      'word': '仅单词',
      'meaning': '仅释义'
    }[mode] || '单词+释义'
  },

  // 定时器
  changeTimer() {
    const idx = (this.data.timerIndex + 1) % this.data.timerOptions.length
    this.setData({ timerIndex: idx })
    if (this.data.playState === STATE.PLAYING) {
      // 重新设置定时
      if (idx > 0) {
        const minutes = [0, 5, 10, 15, 30][idx]
        this.setData({
          remainingSeconds: minutes * 60,
          timerEnd: Date.now() + minutes * 60000
        })
      } else {
        this.setData({ remainingSeconds: 0 })
      }
    }
  },

  // 跳到指定位置
  onSliderChange(e) {
    const index = e.detail.value
    this.setData({
      currentIndex: index,
      showMeaning: false
    })
    this.updateProgress()
    if (this.data.playState === STATE.PLAYING) {
      this.stopCurrentAndSpeak()
    }
  },

  formatTime(seconds) {
    if (seconds <= 0) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }
})
