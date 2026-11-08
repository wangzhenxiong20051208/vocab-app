/**
 * PDF 生成云函数
 * 将单词本导出为 PDF，适合在平板上阅读
 *
 * 部署前需要：
 * cd cloudfunctions/generatePdf
 * npm install pdfkit
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 尝试加载 pdfkit
let PDFDocument
try {
  PDFDocument = require('pdfkit')
} catch (e) {
  console.error('pdfkit not installed')
}

// 内置中文字体 base64（思源黑体精简版）
// 这里用系统字体作为后备方案
const FONT_PATH = './font/NotoSansSC-Regular.ttf'

exports.main = async (event, context) => {
  const { words, title = '生词本' } = event

  if (!PDFDocument) {
    return { error: 'pdfkit not installed. Run: npm install pdfkit' }
  }

  if (!words || words.length === 0) {
    return { error: '没有单词可导出' }
  }

  try {
    // 生成 PDF
    const buffers = []
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: title,
        Creator: '单词本小程序'
      }
    })

    doc.on('data', chunk => buffers.push(chunk))

    // 封面
    doc.fontSize(36)
    doc.text(title, { align: 'center' })
    doc.fontSize(16)
    doc.text(`共 ${words.length} 个单词`, { align: 'center' })
    doc.text(`导出时间：${new Date().toLocaleDateString('zh-CN')}`, { align: 'center' })
    doc.moveDown(2)

    // 分隔线
    doc.moveTo(60, doc.y)
    doc.lineTo(550, doc.y)
    doc.strokeColor('#cccccc').stroke()
    doc.moveDown()

    // 单词列表
    words.forEach((item, index) => {
      // 分页检查
      if (doc.y > 650) {
        doc.addPage()
      }

      const num = index + 1

      // 单词
      doc.fontSize(20)
      doc.fillColor('#1a1a2e')
      doc.text(`${num}. ${item.word}`, { continued: false })

      // 释义
      if (item.meaning) {
        doc.fontSize(14)
        doc.fillColor('#4a90d9')
        doc.text(`   ${item.meaning}`)
      }

      // 例句
      if (item.example) {
        doc.fontSize(11)
        doc.fillColor('#999999')
        doc.text(`   ${item.example}`)
      }

      doc.moveDown(0.8)
    })

    doc.end()

    // 等待 PDF 生成完毕
    const pdfBuffer = await new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)))
    })

    // 上传到云存储
    const fileName = `export/${Date.now()}_${title.replace(/[\/\?<>\\:\*\|"]/g, '_')}.pdf`
    const uploadResult = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: pdfBuffer
    })

    return { fileID: uploadResult.fileID }

  } catch (err) {
    console.error('PDF generation error:', err)
    return { error: err.message }
  }
}
