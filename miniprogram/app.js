// app.js
App({
  globalData: {
    currentBookId: null,
    currentWords: []
  },

  onLaunch() {
    // 初始化云开发（用于PDF导出）
    try {
      wx.cloud.init({
        env: 'your-env-id',
        traceUser: true
      })
      this.globalData.cloudAvailable = true
    } catch (e) {
      console.log('云开发未配置，PDF导出将通过客户端方式')
      this.globalData.cloudAvailable = false
    }

    // 检查是否有用户数据，没有则初始化
    const books = wx.getStorageSync('wordbooks')
    if (!books) {
      // 创建默认词本
      const defaultBook = {
        id: 'default_' + Date.now(),
        name: '我的生词本',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        wordCount: 0
      }
      wx.setStorageSync('wordbooks', [defaultBook])
      wx.setStorageSync('words_' + defaultBook.id, [])
    }
  }
})
