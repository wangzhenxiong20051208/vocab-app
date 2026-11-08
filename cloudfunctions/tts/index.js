/**
 * TTS 语音合成云函数
 * 使用腾讯云 TTS（需开通服务）
 *
 * 部署前需要：
 * 1. 在 cloudfunctions/tts/ 目录下运行 npm install
 * 2. 在腾讯云控制台开通 TTS 服务
 * 3. 配置环境变量 TTS_SECRET_ID 和 TTS_SECRET_KEY
 *
 * 如果不配置腾讯云 TTS，将返回一个 text-to-speech 的 URL，
 * 客户端会使用内置语音合成作为降级方案
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 腾讯云 TTS SDK（需要安装）
let ttsClient = null
try {
  const tencentcloud = require('tencentcloud-sdk-nodejs-tts')
  const TtsClient = tencentcloud.tts.v20190823.Client
  ttsClient = new TtsClient({
    credential: {
      secretId: process.env.TTS_SECRET_ID,
      secretKey: process.env.TTS_SECRET_KEY,
    },
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'tts.tencentcloudapi.com' } }
  })
} catch (e) {
  console.log('Tencent TTS SDK not installed, using fallback')
}

// 缓存的语音（临时存储）
const audioCache = {}

exports.main = async (event, context) => {
  const { text, speed = 1.0 } = event

  if (!text) {
    return { error: 'text is required' }
  }

  // 检查缓存
  const cacheKey = `${text}_${speed}`
  if (audioCache[cacheKey]) {
    return { audioUrl: audioCache[cacheKey] }
  }

  try {
    if (ttsClient) {
      // 使用腾讯云 TTS
      const result = await ttsClient.TextToVoice({
        Text: text,
        SessionId: Math.random().toString(36).substr(2),
        ModelType: 1,      // 1=基础模型
        VoiceType: 101001,  // 亲和女声（中文）
        Speed: speed,
        Codec: 'mp3'
      })

      if (result && result.Audio) {
        // 上传到云存储
        const buffer = Buffer.from(result.Audio, 'base64')
        const fileName = `tts/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.mp3`
        const uploadResult = await cloud.uploadFile({
          cloudPath: fileName,
          fileContent: buffer
        })

        if (uploadResult && uploadResult.fileID) {
          audioCache[cacheKey] = uploadResult.fileID
          return { audioUrl: uploadResult.fileID }
        }
      }
    }

    // TTS 不可用，返回空，客户端会使用降级方案
    return { audioUrl: null, text: text, fallback: true }

  } catch (err) {
    console.error('TTS Error:', err)
    return { error: err.message, fallback: true }
  }
}
