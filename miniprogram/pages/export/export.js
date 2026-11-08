/**
 * 导出页面
 * 支持格式：PDF（通过云函数）、CSV、TXT、JSON
 */
const storage = require('../../utils/storage')

Page({
  data: {
    bookId: '',
    bookName: '',
    wordCount: 0,
    isExporting: false,
    exportFormat: '',
    formats: [
      { id: 'pdf', name: 'PDF 文档', icon: '📄', desc: '适合在平板上阅读学习', recommend: true },
      { id: 'csv', name: 'CSV 表格', icon: '📊', desc: 'Excel/WPS 可打开' },
      { id: 'txt', name: '纯文本', icon: '📝', desc: '每行一个词，用制表符分隔' },
      { id: 'json', name: 'JSON 数据', icon: '📋', desc: '完整数据，可迁移到其他工具' }
    ]
  },

  onLoad(options) {
    const bookId = options.bookId
    const book = storage.getBook(bookId)
    const words = storage.getWords(bookId)
    if (book) {
      this.setData({
        bookId,
        bookName: book.name,
        wordCount: words.length
      })
    }
  },

  selectFormat(e) {
    const format = e.currentTarget.dataset.format
    this.setData({ exportFormat: format })
  },

  doExport() {
    const { bookId, exportFormat } = this.data
    if (!exportFormat) {
      wx.showToast({ title: '请选择导出格式', icon: 'none' })
      return
    }

    this.setData({ isExporting: true })

    switch (exportFormat) {
      case 'pdf':
        this.exportPdf()
        break
      case 'csv':
        this.exportCsv()
        break
      case 'txt':
        this.exportTxt()
        break
      case 'json':
        this.exportJson()
        break
    }
  },

  // ======== PDF 导出（云函数） ========

  exportPdf() {
    const { bookId, bookName } = this.data
    const words = storage.getWords(bookId)

    wx.showLoading({ title: '生成 PDF...' })

    wx.cloud.callFunction({
      name: 'generatePdf',
      data: {
        words: words.map(w => ({
          word: w.word,
          meaning: w.meaning,
          example: w.example || ''
        })),
        title: bookName
      }
    }).then(res => {
      wx.hideLoading()

      if (res.result && res.result.fileID) {
        // 打开 PDF
        wx.openDocument({
          filePath: res.result.fileID,
          fileType: 'pdf',
          success: () => {
            wx.showToast({ title: 'PDF 已生成', icon: 'success' })
          },
          fail: () => {
            // 下载到本地
            this.downloadFile(res.result.fileID, `${bookName}.pdf`)
          }
        })
      } else {
        wx.showToast({ title: res.result.error || '生成失败', icon: 'none' })
      }
    }).catch(err => {
      wx.hideLoading()
      console.error('PDF generation failed:', err)
      wx.showModal({
        title: 'PDF 生成失败',
        content: '请确认云函数已部署。是否导出为 CSV？',
        success: (res) => {
          if (res.confirm) {
            this.exportCsv()
          }
        }
      })
    }).finally(() => {
      this.setData({ isExporting: false })
    })
  },

  // ======== CSV 导出 ========

  exportCsv() {
    const { bookId, bookName } = this.data
    const csv = storage.exportAsCsv(bookId)
    this.saveToFile(csv, `${bookName}.csv`, 'text/csv')
  },

  // ======== TXT 导出 ========

  exportTxt() {
    const { bookId, bookName } = this.data
    const text = storage.exportAsText(bookId)
    this.saveToFile(text, `${bookName}.txt`, 'text/plain')
  },

  // ======== JSON 导出 ========

  exportJson() {
    const { bookId, bookName } = this.data
    const data = storage.exportAsJson(bookId)
    const json = JSON.stringify(data, null, 2)
    this.saveToFile(json, `${bookName}.json`, 'application/json')
  },

  // ======== 文件保存 ========

  saveToFile(content, fileName, fileType) {
    // 小程序中，使用 FileSystemManager 写入临时文件
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

    try {
      fs.writeFileSync(filePath, content, 'utf8')
      this.setData({ isExporting: false })

      wx.showActionSheet({
        itemList: ['分享文件', '保存到手机'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 分享
            wx.shareFileMessage({
              filePath: filePath,
              fileName: fileName
            })
          } else {
            // 保存到手机（部分格式支持）
            wx.saveFileToDisk({
              filePath: filePath,
              success: () => {
                wx.showToast({ title: '已保存', icon: 'success' })
              },
              fail: () => {
                wx.showToast({ title: '保存失败', icon: 'none' })
              }
            })
          }
        }
      })
    } catch (e) {
      console.error('Save file error:', e)
      // 降级方案：复制到剪贴板
      wx.setClipboardData({
        data: content.substring(0, 5000),
        success: () => {
          wx.showToast({ title: '内容已复制到剪贴板', icon: 'success' })
        }
      })
    }

    this.setData({ isExporting: false })
  },

  downloadFile(fileID, fileName) {
    wx.cloud.downloadFile({
      fileID: fileID,
      success: (res) => {
        wx.saveFileToDisk({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已下载', icon: 'success' })
        })
      },
      fail: () => wx.showToast({ title: '下载失败', icon: 'none' })
    })
  }
})
