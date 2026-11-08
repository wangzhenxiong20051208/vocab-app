// pages/index/index.js
const storage = require('../../utils/storage')

Page({
  data: {
    books: [],
    showCreateDialog: false,
    newBookName: '',
    showDeleteConfirm: false,
    deleteTargetId: null,
    searchKeyword: ''
  },

  onShow() {
    this.loadBooks()
  },

  loadBooks() {
    const books = storage.getBooks()
    this.setData({ books })
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  showCreate() {
    this.setData({
      showCreateDialog: true,
      newBookName: ''
    })
  },

  hideCreate() {
    this.setData({ showCreateDialog: false })
  },

  onBookNameInput(e) {
    this.setData({ newBookName: e.detail.value })
  },

  createBook() {
    const name = this.data.newBookName.trim()
    if (!name) {
      wx.showToast({ title: '请输入词本名称', icon: 'none' })
      return
    }
    storage.createBook(name)
    this.hideCreate()
    this.loadBooks()
    wx.showToast({ title: '创建成功', icon: 'success' })
  },

  openBook(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/wordbook/wordbook?id=${id}`
    })
  },

  confirmDelete(e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      showDeleteConfirm: true,
      deleteTargetId: id
    })
  },

  cancelDelete() {
    this.setData({
      showDeleteConfirm: false,
      deleteTargetId: null
    })
  },

  doDelete() {
    const id = this.data.deleteTargetId
    if (id) {
      storage.deleteBook(id)
      this.cancelDelete()
      this.loadBooks()
      wx.showToast({ title: '已删除', icon: 'success' })
    }
  },

  formatTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
    if (diff < 172800000) return '昨天'
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  onRename(e) {
    const id = e.currentTarget.dataset.id
    const book = storage.getBook(id)
    if (!book) return

    wx.showModal({
      title: '重命名',
      content: '',
      placeholderText: book.name,
      editable: true,
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          storage.renameBook(id, res.content.trim())
          this.loadBooks()
        }
      }
    })
  }
})
